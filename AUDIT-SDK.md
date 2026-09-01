# AUDIT-SDK — viewer-side monetisation correctness, trust model, integration surface

**Date:** 2026-08-12
**Auditor:** Claude (read-only; no files in any repo were modified other than this one)
**Primary:** `~/Documents/Code/jubjub-sdk` @ `0511e22` (2026-07-03), 2,085 LOC TS
**Also read:** `farcaster_miniapp/index.html` (integration consumer), backend
`/v2/streaming/*`, `/v2/public/*`, `/v2/platform/*` in `movie_system_jubjub`,
`Onchain/contracts/JubJubPaymentRouter.sol`

### Method

Full read of all 14 SDK source modules; trace of every SDK→backend call to its
handler and on into `streaming_session_manager.py` and the Router contract; a
reproducible rebuild of the UMD bundle in a scratch directory for the K4 diff.

### One correction to the brief before we start

The brief states *"backend auto-settles ~each minute via Router.settle()"*.
**It does not.** `record_segment()` is pure Firestore tracking with no on-chain
call (`streaming_session_manager.py:287-303`), `SETTLE_INTERVAL_SECONDS = 60` is
declared at `:41` and referenced nowhere else in the repo, and the only caller of
`settle_session()` is `close_session()` (`:408`). The idle cron closes sessions
after **600 seconds** of silence, not 60. Every finding below is written against
what the code does: **all settlement happens once, at session close.** This single
fact drives K2-1, K3-1 and most of the fairness findings.

---

# K1 — TRUST BOUNDARY

## Summary: what the backend takes on faith

| Value | Source | Verified? | Bounded by |
|---|---|---|---|
| **wallet identity (session create)** | server-side profile lookup | **YES — good** | n/a |
| **wallet identity (token mint)** | client request body | **NO** | nothing |
| **segment count** | one POST = one segment | **NO** | $2/session cap, 40× rate cap |
| **segment timing** | none — no wall-clock check | **NO** | rate cap only |
| **content_id** | client-chosen, any content | **NO** | nothing |
| **price per minute** | client-set at registration, `ge=0` | **NO upper bound** | nothing |
| **playback position** | `playback_seconds` in close body | **NO** — but telemetry only | not billed |
| **which content was fetched** | never correlated | **NO** | nothing |

Two of these are load-bearing and safe. `create_streaming_session` **ignores** the
`viewer_wallet` the SDK sends and resolves the wallet from the authenticated
profile (`streaming_routes.py:136`), and `update_playback_seconds` is explicitly
marked *"Telemetry-only … Not used for billing"* (`streaming_session_manager.py:309`)
with `settle_session` billing from `segment_count` alone (`:331-333`). Those are
the right decisions and they should be preserved through any fix below.

Everything else rests on client honesty, and two of them rest on nothing at all.

---

## K1-1 — `POST /v2/public/viewer-session` mints a full account credential for any wallet address, with no proof of ownership — **CRITICAL**

**FINDING.** The endpoint the SDK calls to bootstrap a viewer takes a bare wallet
address, looks up (or creates) the profile that owns it, and returns a 24-hour
`jj_` bearer token for that profile. There is no signature, no nonce, no
attestation, no rate limit, and the endpoint is `Access-Control-Allow-Origin: *`.
The resulting token is not scoped to streaming — it resolves to a plain
`profileId` accepted by **every** route that depends on `get_current_user`.

**EVIDENCE.**
- `backend/.../sdk_routes.py:700-739` — `create_viewer_session`; the only
  validation is `_EVM_RE.match(wallet)` (`:715`). Docstring: *"Public endpoint —
  no auth required."*
- `sdk_routes.py:120-146` — `_resolve_or_create_profile` resolves by
  `profiles.where("wallet_addresses", "array_contains", wallet)`; this matches
  **creator** profiles, not just viewer profiles.
- `session_token_service.py:29` — `DEFAULT_TTL_SECONDS = 86400`.
- `check_tokens.py:321-336` — `_check_session_token` returns
  `{"profileId": ..., "auth_method": "session_token"}` with no scope field
  consumed anywhere. A repo-wide grep for `auth_method` finds **no route** that
  restricts on it.
- `api.py:266-295` — `SDKCorsMiddleware` sets `Allow-Origin: *` on
  `/v2/public/`, `/v2/streaming/`, `/v2/platform/`.
- Contrast: `POST /v2/auth/register-viewer` (`viewer_auth_routes.py:124`) requires
  a Privy attestation **or** a SIWE signature. The correct pattern already exists
  in the codebase, one file away.

**DIVERGENCE.** The intended model is "the viewer's wallet is the principal, and
holding the wallet proves it". Actual model: *knowing* an address — which is public
on-chain — is sufficient to act as its owner for 24 hours. Combined with K1-2 this
is the drain path the brief asks about, and it is available to an anonymous
attacker, not merely to a malicious host:

1. Read any wallet address that has approved the Router (public on Basescan).
2. `POST /v2/public/viewer-session` with it → `jj_` token.
3. `POST /v2/streaming/sessions` with `content_id` = content the attacker owns
   → backend calls `Router.createSession(viewer=victim, ...)`.
4. POST segments, then close → `Router.settle` → `transferFrom(victim)` pulls up
   to $2.00 per session; 97% lands in the attacker's content contract.
5. Repeat until the victim's standing allowance ($10 default) is exhausted.

The contract-side caps do bound this — `MAX_SESSION_AMOUNT` $2/session
(`streaming_session_manager.py:42`, enforced as `ExceedsSessionCap` at
`JubJubPaymentRouter.sol:125`) and the ERC-20 allowance — but they bound it to
"the viewer loses their whole standing allowance", which is the entire amount at
risk anyway. **The caps limit the blast radius per session, not per victim.**

The token is also not confined to payments. It is a general profile credential:
it will satisfy `get_current_user` on content, media, workspace, team, wallet and
AI-credential routes.

**FIX SKETCH.** Make the viewer-session endpoint prove wallet control the same way
`register-viewer` already does — issue a nonce from `auth_nonces_v1`, require an
EIP-191 signature over it, and recover the address with `eth_account`; reuse
`auth_nonce_routes.py` wholesale rather than writing a second implementation. That
costs the viewer one extra signature on first use, which can be folded into the
same wallet interaction as the USDC approve so the UX cost is nil. Independently,
and shippable first because it is a few lines: give the `jj_` token a `scope`
claim of `streaming` and add a dependency that the streaming routes use, so a
leaked or forged viewer token can never reach content/team/wallet routes; and cap
issuance per address per hour in `firestore_rate_limit_repository`. If the
signature work has to wait, the scope restriction alone converts this from
account takeover into allowance drain, which is a materially smaller incident.

---

## K1-2 — A streaming session can be created for any `content_id`, with no link to a playback fetch — **CRITICAL (compounds K1-1)**

**FINDING.** The brief asks specifically whether a session can be created and
settled for content the viewer never fetched a playback URL for. It can. Nothing
correlates a session with a `playback-info` fetch, a page view, an origin, or any
prior interaction. The handler takes `content_id`, resolves the caller's wallet,
and immediately spends operator gas on `Router.createSession`.

**EVIDENCE.**
- `streaming_routes.py:122-185` — no check beyond auth and
  `_get_profile_wallet(...)`.
- `streaming_session_manager.py:202-243` — the only content-side gate is that the
  content exists and has `ownership_contract_address`. The `payment_rules_v2`
  check at `:214-222` is dead by construction: it is `if not rules_doc.exists and
  not content_contract`, and `content_contract` was already proven truthy at
  `:208`, so the condition can never be true.
- No rate limiting exists on this route (grep for `check_rate_limit` /
  `rate_limit` in `streaming_routes.py` and `sdk_routes.py` returns nothing).

**DIVERGENCE.** "A session represents a viewer watching a specific piece of
content" degrades to "a session is an arbitrary instruction to charge a wallet
toward a contract of the caller's choosing". The attacker picks the destination
contract, which is what turns K1-1 from vandalism into theft with a payout.

There is a second, unauthenticated-adjacent consequence: each call burns a 300,000-gas
operator transaction (`streaming_session_manager.py:242`). An attacker looping
this endpoint drains the operator wallet's ETH and, because `send_transaction`
serialises on operator nonce, stalls minting, spine writes and settlement for
every legitimate user. That is a full-platform DoS reachable with no credential
beyond a wallet address.

**FIX SKETCH.** Bind session creation to evidence of intent to watch. The cheapest
version that closes the gas-DoS and most of the theft path: rate-limit session
creation per profile and per wallet (a handful per minute, a few dozen per day)
before any on-chain call, and reject a second `active` session for the same
(wallet, content) pair by querying `streaming_sessions_v2` first — that also fixes
the orphan accumulation in K3-5. A stronger version, worth doing once the
signature work in K1-1 lands: have `playback-info` issue a short-lived
content-scoped nonce that `POST /v2/streaming/sessions` must present, so a session
provably follows a real playback fetch from a real page. Also delete the dead
`payment_rules_v2` branch or make it a real gate — as written it advertises a
check that cannot fire.

---

## K1-3 — Segment count is an unverified POST count with no wall-clock bound — **HIGH**

**FINDING.** Billing quantity is "how many times did the client POST to
`/segment`". The endpoint takes no body, no timestamp, no sequence number. The
handler increments a counter. Nothing compares elapsed wall-clock against claimed
watch time, so segments can be posted arbitrarily faster than real time.

**EVIDENCE.**
- `streaming_routes.py:188-229` — the route signature is `(session_id,
  current_user)`; there is no payload to validate.
- `streaming_session_manager.py:287-303` — `record_segment` increments
  `segment_count` and stamps `last_segment_at`. No timing check.
- Client side: `CostTracker.ts:55-61` fires one POST per crossed 6-second
  boundary of accumulated playback.
- Billing: `settle_session` at `:331-333` computes
  `segment_count * 6 * 5000 // 60`.

**DIVERGENCE and who gains what.**

*A modified client lying downward* — simply don't POST. `segment_count` stays 0,
`total_owed` is 0, settle no-ops (`:336`), the viewer watches free. On Tier 1
(everything shipped today, including the entire mini-app) the SDK never controls
the media element's source, so blocking the SDK entirely is equally effective and
requires no modification at all — a uBlock filter is sufficient. **Tier-1 billing
integrity rests wholly on client honesty; there is no server-side mechanism that
could detect or prevent it.** This is a design property, not a bug, but it should
be stated in the docs rather than implied away.

*A malicious host lying upward* — this is the interesting case the brief raises,
and it works. The host embeds the SDK (or just calls the API directly with the
viewer's `jj_` token, which the host can mint anyway under K1-1), posts segments
far faster than playback, and settles toward its own content contract. The viewer's
allowance drains toward the host at up to 40× the honest rate. The bounds:

- `ExceedsSessionCap` at `Router.sol:125` — hard stop at $2.00 per session.
- The rate cap at `Router.sol:129-137`: `totalAfter * 60 <= 200000 * elapsed`,
  with `elapsed` measured from **session creation**, not last settle. This permits
  a cumulative average of 3,333 units/second. The honest streaming rate is
  $0.005/min = 83.3 units/second. **The cap therefore allows exactly 40× the
  nominal rate before it reverts.** Over-report by 5× and it settles cleanly;
  over-report by 50× and the tx reverts — which, per K3-1, silently marks the
  session `failed` and charges nothing.

So the contract bounds the fraud to 40× rate and $2/session, and the ERC-20
allowance bounds total exposure to $10. A host that opens sessions in a loop
reaches that $10 in five sessions.

**FIX SKETCH.** Make the server compute what it is willing to believe. On each
`record_segment`, read `created_at` and reject (or clamp) when
`segment_count * 6` exceeds wall-clock elapsed plus a small tolerance — the
session document already stores `created_at` and `last_segment_at`, so this is a
comparison against data already in hand and costs no extra read. That single
clamp reduces the host-inflation ceiling from 40× to ~1×, which is the difference
between "a host can drain a viewer" and "a host can round up". Pair it with a
per-session segment ceiling derived from the content's actual duration
(`media_v2` already carries it), so a 90-second clip can never bill 400 minutes.

---

## K1-4 — Tier-2 signed URLs are issued on session *existence*, not on payment *progress* — **HIGH**

**FINDING.** `POST /v2/streaming/sessions/{id}/playback-url` gates on
`status == "active"` and nothing else. A session that has never posted a single
segment — and therefore will never be billed a cent — is `active` and keeps
receiving fresh signed URLs indefinitely. Because the idle cron skips sessions
with a null `last_segment_at` (K3-2), such a session is never closed either.

**EVIDENCE.**
- `streaming_routes.py:274-279` — the gate is `if session.get("status") !=
  "active": raise 403`. No reference to `segment_count` or `amount_settled`.
- `streaming_session_manager.py:480-484` — the idle sweeper does
  `last_seg = data.get("last_segment_at"); if not last_seg: continue`.
- `PlaybackUrlRefresher.ts:157-174` re-resolves at 80% of TTL, so a client that
  simply never calls `recordSegment` gets a fresh 120-second URL every ~96
  seconds, forever.

**DIVERGENCE.** Tier 2 is described as the tier where "payment is secured" before
media is released (`JubJub.ts:786-788`, `playback_url_signer.py:10-20`). In
practice it releases media on *session creation*, and session creation is free.
The one tier designed to be robust against a dishonest client is defeated by the
same omission that makes Tier 1 advisory.

**FIX SKETCH.** Gate re-issuance on payment keeping pace: refuse a new signed URL
when `segment_count * 6` lags the session's wall-clock age by more than a grace
window (say two segments). The first URL is free — it has to be, since playback
hasn't started — but the second and subsequent ones require evidence that the
first was paid for. This turns the refresher loop into the enforcement point it
was always meant to be, and needs no new state: `segment_count`, `created_at` and
`last_segment_at` are already on the document.

---

## K1-5 — The platform key is a full profile credential, and the documented integration puts it in the page — **CRITICAL**

**FINDING.** `X-JubJub-Platform-Key` resolves to an unrestricted `profileId`
accepted by every `get_current_user` route. The SDK's documented integration
requires the key to be passed to `JubJub.init({ platformKey })` in client-side
JavaScript, so it is public by design. The mini-app ships one hardcoded in
committed HTML.

**EVIDENCE.**
- `check_tokens.py:300-317` — `_check_platform_key` returns
  `{"profileId": result["profile_id"], ...}`; `verify_token_cookie:346-351`
  returns it for any route.
- `platform_key_service.py:58-85` — verification checks only hash + `status ==
  "active"`. No scopes, no origin allowlist, no rate limit, no expiry.
- `README.md:8-13` — the headline integration is
  `<script>JubJub.init({ platformKey: 'pk_YOUR_KEY' });</script>` in a site template.
- `farcaster_miniapp/index.html:757` — `const PLATFORM_KEY =
  'pk_CQnmUBJbX47mvNXnTfagarzJw-ucqU7rJK_XcseY4CM';` — committed to git, served
  to every visitor.

**DIVERGENCE.** The key is documented as a platform identifier for content
registration. It is implemented as a password. Anyone who views source on any
integrator's page — or on `mini.jubjubapp.com` — obtains full API access to that
profile: read and write content, media, workspaces, teams, and the profile's AI
credential surface.

**FIX SKETCH.** Split the credential in two. `pk_` keys should authenticate
*only* `/v2/platform/register-content` and only for the key's own profile —
implement that as a distinct FastAPI dependency rather than routing through
`get_current_user`, so the blast radius is structural rather than
convention-based. Add an `allowed_origins` array to the `platform_keys_v1`
document and check `Origin` on browser-borne requests, which is the piece that
makes a public key safe to publish. Then rotate the mini-app's key — it is
compromised by publication and should be treated as such regardless of whether
misuse has been observed. Longer term, registration belongs on the integrator's
server (the README already shows that pattern as "optional"); making it the only
pattern removes the public-key problem entirely.

---

## K1-6 — `price_per_minute` is client-set with no upper bound, and feeds the viewer's approve amount — **HIGH**

**FINDING.** Content registration accepts any non-negative price. That price is
returned by `playback-info` and used by the SDK to size the USDC approval. The
SDK's documented "hard ceiling" on the approval does not constrain it, because
the ceiling is applied before a floor that can exceed it.

**EVIDENCE.**
- `sdk_routes.py:47` — `price_per_minute: float = Field(default=0.005, ge=0)`.
  No `le=`.
- `Approval.ts:122-133` — `_boundedSessionAmount` = `price × 120 minutes × 1e6`,
  with no ceiling.
- `Approval.ts:143-157` — `_boundedStandingAllowance` clamps the *configured*
  dollars to `MAX_STREAMING_ALLOWANCE_USD` (500) at `:152`, then returns
  `standing > sessionBound ? standing : sessionBound` at `:156`. **When
  `sessionBound` exceeds the clamp, `sessionBound` wins and the clamp is
  bypassed.** A content item registered at $100/min yields a `sessionBound` of
  $12,000 and an approve request for $12,000 — 24× the documented maximum.
- The comment at `:52-55` states the opposite: *"Hard ceiling so a mis-set config
  can never request an absurd (or effectively unbounded) allowance."*

**DIVERGENCE.** The function's stated invariant is false on the exact input it
was written to defend against. The viewer still sees the amount in their wallet
prompt, so this is not a silent drain — but it is precisely the "unlimited
approval"-shaped prompt that commit `f6a88ba` set out to eliminate, and inside an
embedded mini-app wallet the amount is far less scrutinised than in a MetaMask
modal.

**FIX SKETCH.** Apply the ceiling last: clamp the returned value rather than the
input dollars, so `min(max(standing, sessionBound), MAX_STREAMING_ALLOWANCE_USD)`
is the shape. If `sessionBound` genuinely exceeds the ceiling, that content is too
expensive for the standing-allowance model and should surface as a refusal, not
as a bigger prompt. Independently, bound `price_per_minute` server-side at
registration — a sane ceiling (a few dollars per minute) costs nothing and stops
the value being an attacker-controlled multiplier at all.

---

## K1-7 — Content price is displayed and approved against, but never charged — **HIGH**

**FINDING.** Settlement uses a hardcoded module constant, not the content's
price. Every piece of content on the platform bills at $0.005/min regardless of
what the creator set, while the SDK overlay, the mini-app's "$X/min" copy, and the
approval sizing all use the real price.

**EVIDENCE.**
- `streaming_session_manager.py:39` — `PRICE_PER_MINUTE_USDC = 5000`.
- `:331-333` — `total_owed = segment_count * SEGMENT_DURATION_SECONDS *
  PRICE_PER_MINUTE_USDC // 60`. The content document's `price_per_minute_usdc` is
  never read in this module.
- Consumers of the real price: `sdk_routes.py:558` (playback-info),
  `CostTracker.ts:32` (`pricePerSecond`), `farcaster_miniapp/index.html:918`
  (*"Tap ▶ to play · $"+price+"/min"*).

**DIVERGENCE.** A creator who sets $0.05/min earns one tenth of what the viewer
was quoted and one tenth of what the overlay counted. A creator who sets $0.001
earns five times it. This is a straightforward revenue-correctness defect, and it
is invisible to everyone: the viewer sees the quoted price, the creator sees the
quoted price, and only the chain disagrees.

**FIX SKETCH.** Read `price_per_minute_usdc` from the content document in
`settle_session` and carry it onto the session document at creation time, so the
rate is pinned for the life of the session and a mid-session price edit cannot
retroactively change what a viewer owes. Keep the module constant as the fallback
for documents that predate the field. Once the price is pinned on the session,
the SDK can also be handed the authoritative figure rather than inferring it,
which closes most of K3-3.

---

# K2 — PAYMENT FLOW CORRECTNESS

## The actual end-to-end trace

```
SDK                          Backend                        Chain
───                          ───────                        ─────
getPlaybackInfo         →  GET /v2/public/.../playback-info   (public, no auth)
                           returns price, router, usdc, chain_id, gated

_ensureWallet           →  (browser wallet / injected provider)

createViewerSession     →  POST /v2/public/viewer-session     ← K1-1: unverified
                           returns jj_ token (24h, unscoped)

Approval.ensureApproved →  allowance(owner, router) via public RPC
   if < sessionBound    →  USDC.approve(router, standingAllowance)  →  approve tx
                                                                       (viewer gas)
Session.create          →  POST /v2/streaming/sessions
                           wallet from PROFILE, not body  ✓
                                                          →  Router.createSession
                                                             (operator gas, 300k)
[Tier 2 only]
getSessionPlaybackUrl   →  POST .../playback-url              ← K1-4: gates on
                           120s signed GCS URL                  status only

CostTracker per 6s      →  POST .../segment                   ← K1-3: unverified
                           segment_count++ ONLY               NO ON-CHAIN CALL

close / beaconClose     →  POST .../close | /beacon-close
                           settle_session()                →  Router.settle(...)
                                                              ← THE ONLY SETTLEMENT
                           close_session()                 →  Router.closeSession
```

---

## K2-1 — There is no periodic settlement; the entire session settles once, at close — **HIGH**

**FINDING.** The design intent (a settle roughly every minute) is present as a
constant and as three docstrings, and absent from the code. Revenue for a session
exists only as a Firestore counter until the session closes.

**EVIDENCE.**
- `streaming_session_manager.py:41` — `SETTLE_INTERVAL_SECONDS = 60`. Grep across
  the whole backend: this is the only occurrence.
- `:287-288` — `record_segment` docstring: *"Tracking only — no on-chain
  settlement."* Contradicted by the module docstring at `:10` (*"increment segment
  count, auto-settle when due"*) and by the route docstring at
  `streaming_routes.py:194-195` (*"Auto-settles when 1 minute of unsettled
  segments accumulates"*).
- Only caller of `settle_session`: `close_session` at `:408`.
- `IDLE_CLOSE_SECONDS = 600` (`:459`) — the cron closes after ten minutes of
  silence, not sixty seconds. CLAUDE.md schedules the job every minute, which
  makes the job run 10× more often than it can ever act.

**DIVERGENCE.** Every failure that prevents a clean close converts the entire
session's revenue to zero rather than losing the last minute of it. A viewer who
watches 40 minutes and then loses connectivity in a way that also breaks the
close path costs the creator the whole 40 minutes. It also concentrates all
settlement risk into one transaction that has no retry (K3-1).

It is worth noting the rate cap makes deferred settlement *safe* — `elapsed` runs
from session creation, so a single large settle at close is checked against the
whole session duration and passes comfortably at honest rates. The problem is
durability, not legality.

**FIX SKETCH.** Settle incrementally on the heartbeat: in `record_segment`, when
unsettled value exceeds a threshold and enough wall-clock has passed to satisfy
the rate cap, dispatch `settle_session` as a background task rather than inline
(the segment POST must stay fast — it is on the playback path). The bookkeeping
already supports this: `amount_settled` is a running total and `settle_session` is
written to settle only the delta, so it is safe to call repeatedly. Delete
`SETTLE_INTERVAL_SECONDS` or use it. Separately, correct the two docstrings that
describe behaviour that does not exist — they are actively misleading, and the
route-level one is what a new engineer reads first.

---

## K2-2 — Allowance exhaustion mid-session reverts and is terminal; there is no re-approval path — **HIGH**

**FINDING.** The SDK checks the allowance exactly once, before the session starts,
and never again. If the allowance is insufficient at settle time — because it was
drawn down by concurrent sessions, spent elsewhere, or revoked — the settle
reverts and the session is marked permanently `failed`. Nothing prompts the
viewer to re-approve, and nothing retries.

**EVIDENCE.**
- `Approval.ts:211-215` — `ensureApproved()` is called once, from
  `JubJub.ts:753`. No re-check thereafter; `Approval` holds no reference to the
  live session.
- `Router.sol:141-142` — `if (allowance < amount) revert InsufficientAllowance`.
- `streaming_session_manager.py:392-398` — any settle exception sets
  `status: "failed"` and returns.
- `close_session:409-410` — `if session["status"] == "failed": return session`,
  so `Router.closeSession` is never called and the on-chain session stays `active`
  forever.

**DIVERGENCE.** The standing-allowance model (`Approval.ts:40-51`) is explicitly
"approve once, stream many sessions". Multiple sessions drawing on one allowance
is therefore the *expected* steady state — but the only allowance check happens
before the first of them, and the failure mode when it runs out is silent, total,
and unrecoverable. The viewer keeps watching (nothing pauses the video), the
creator is paid nothing, and the session leaks on-chain.

Insufficient USDC *balance* behaves identically: `transferFrom` reverts inside the
ERC-20, the receipt fails, same terminal state.

**FIX SKETCH.** Two halves. Server side: on `InsufficientAllowance` or a transfer
revert, do not mark the session `failed` — mark it `payment_blocked`, keep it
eligible for the recovery worker in K3-1, and settle whatever the remaining
allowance does cover before stopping. Client side: have the SDK re-check the
allowance against remaining exposure periodically (the refresher already runs a
timer that could carry it), and when it falls below one session's bound, emit a
`payment:required`-style event and re-run `ensureApproved` so the viewer gets a
top-up prompt instead of silently free-riding. The gate UI for this already
exists — `_createPaymentGate` at `JubJub.ts:125` — so the missing piece is the
trigger, not the surface.

---

## K2-3 — Behaviour at `MAX_SESSION_AMOUNT`: playback continues, free and unremarked — **MEDIUM**

**FINDING.** When a session reaches the $2 cap, `settle_session` clamps the delta
to zero and returns. Segments keep accruing, the overlay keeps counting, the video
keeps playing, and nothing is charged. No new session is opened.

**EVIDENCE.** `streaming_session_manager.py:340-344` — clamp to
`max_amount - amount_settled`, then `if amount_to_settle <= 0: return session`.
The SDK has no knowledge of `max_amount` at all: `Session.ts:3-22` stores only
`id` and `onChainId`, discarding the `max_amount` and `amount_settled` the API
returns.

**DIVERGENCE.** Reaching the cap should either stop playback or roll into a new
session. It does neither. At the flat $0.005/min actually charged (K1-7) the cap
is 400 minutes of viewing, so this is not currently reachable in practice — but it
becomes reachable the moment per-content pricing is fixed, which makes it a
latent defect that the K1-7 fix would activate.

**FIX SKETCH.** Have `Session` retain `maxAmount` and `amountSettled` from the
create response and from periodic session reads, and have `CostTracker` stop
posting segments and emit a session-limit event as the cap approaches. The SDK can
then either close and re-open a session transparently (preferred — the approval
carries over, so it costs the viewer nothing) or gate. Server side, refuse
`record_segment` once the cap is reached rather than accepting segments that can
never be billed.

---

## K2-4 — Multi-clip: approval is shared, sessions are not, and prior sessions are never closed — **MEDIUM/HIGH**

**FINDING.** The approval correctly carries across clips via module-level state.
Sessions do not: each video creates its own `JubJub` instance and its own session,
and moving to the next clip never closes the previous one. Nothing calls
`disconnect()` on the auto-discover path.

**EVIDENCE.**
- Shared: `JubJub.ts:41` `_sharedWallet`, `:551-554` single-flight connect;
  `Approval.isApproved()` gates on `sessionBound`, not the full standing amount
  (`Approval.ts:190`) — so partial drawdown does not re-prompt. This part is well
  built and matches the commit `c7cfecc` intent.
- Not shared: `JubJub.ts:259-291` `play()` constructs a new instance per video;
  `:771` creates a session per instance.
- `disconnect()` (`:860`) is public but never invoked internally.
  `_prepareVideo` (`:394-520`) has no teardown path.
- Cost per clip: `Router.createSession` (300k gas) + `settle` (500k) +
  `closeSession` (100k) — three operator transactions per clip.

**DIVERGENCE.** The boundary is enforced nowhere. Watching five clips leaves four
`active` sessions, each holding an open on-chain session against the viewer's
wallet, until the idle cron closes them ten minutes later — and only if each
posted at least one segment (K3-2). Every retry click on the payment gate creates
yet another (`JubJub.ts:506` re-arms `run()`, which calls `JubJub.play()` again).

The economics also deserve a look: at $0.005/min, a 60-second clip earns 5,000
units ($0.005) and costs three operator transactions. Base gas is cheap, but the
ratio is worth measuring before the connector-ladder work multiplies clip volume.

**FIX SKETCH.** Track the active instance at module level and close the previous
session when a new video starts — the summary from `disconnect()` is already the
right shape for this. Add a `pagehide`/`visibilitychange` handler alongside the
existing `beforeunload` (`:844-849`), since `beforeunload` does not fire reliably
on mobile Safari, which is the mini-app's primary surface. Server side, refuse a
second `active` session for the same (wallet, content) and return the existing
one, which makes the client-side leak harmless.

---

## K2-5 — Segment posts have no retry and no idempotency — **MEDIUM**

**FINDING.** `recordSegment` is fire-and-forget with an empty catch. A 5xx, a
network blip, or a backgrounded-tab fetch abort silently loses that segment's
revenue. There is also no idempotency key, so adding a retry later would
double-bill.

**EVIDENCE.**
- `CostTracker.ts:58` — `this.api.recordSegment(this.session.id).catch(() => {})`.
- `ApiClient.ts:177-185` — `recordSegment` logs to console on failure and
  resolves normally; the caller cannot distinguish success from failure.
- The endpoint carries no client-generated identifier, so the server cannot
  deduplicate: two POSTs are two segments by definition.

**DIVERGENCE.** The brief asks what happens if the same batch is posted twice
after a network error. Today: it cannot happen, because nothing retries — the
failure mode is under-billing, not double-billing. But the moment anyone adds a
retry (an obvious fix for the loss) it becomes double-billing, because the
protocol has no way to say "this is the same segment I already sent".

**FIX SKETCH.** Give the segment POST a client-generated monotonic index —
`CostTracker` already computes `currentBoundary`, which is exactly that number —
and have the server record the highest index seen and treat a repeat as a no-op.
That makes retries safe, makes the count idempotent, and as a bonus gives the
server a cross-check against its own counter for K1-3. Then add a bounded retry
with backoff, and buffer unsent indices so a reconnect can flush them.

---

# K3 — FAILURE MODES AND VIEWER FAIRNESS

## K3-1 — A failed settle is terminal: no retry, no recovery worker, session leaks on-chain — **CRITICAL (revenue)**

**FINDING.** Any exception or failed receipt during `Router.settle` sets the
session `status: "failed"`. Nothing ever revisits a `failed` session. The idle
sweeper queries only `status == "active"`. `close_session` bails before
`Router.closeSession`, so the on-chain session remains `active` indefinitely.

**EVIDENCE.**
- `streaming_session_manager.py:370-379` (bad receipt) and `:392-398`
  (exception) — both write `status: "failed"`.
- `:409-410` — `close_session` returns early on `failed`, skipping
  `Router.closeSession`.
- `:474-478` — `settle_idle_sessions` filters `.where("status", "==", "active")`.
- No recovery worker exists for streaming. Contrast `mcp/x402_settle_recovery.py`,
  which does exactly this job for the x402 rail and runs on a `*/5` cron — the
  pattern is already in the codebase.

**DIVERGENCE.** Every transient condition — RPC timeout, operator nonce
collision, gas spike, momentary allowance shortfall — permanently destroys that
session's revenue and leaves an orphaned on-chain session. Given K2-1 (everything
settles at close), one bad minute costs an entire viewing session, and there is
no alert, no queue, and no metric that would surface it. This is the finding most
likely to be quietly costing money in production right now.

**FIX SKETCH.** Copy the x402 recovery pattern: keep the failed attempt in a
retriable state with an attempt counter and a next-attempt timestamp, add a cron
that re-settles and then closes, and only mark terminal after a bounded number of
attempts — at which point it should raise an alert rather than disappear.
Distinguish retriable failures (RPC, nonce, timeout) from permanent ones
(`ExceedsSessionCap`, content contract missing) so the queue does not fill with
work that can never succeed. Ensure `Router.closeSession` runs even when settle
fails permanently, so the on-chain session does not leak.

---

## K3-2 — Sessions that never post a segment are never closed, and keep serving gated URLs — **HIGH**

**FINDING.** The idle sweeper skips any session whose `last_segment_at` is null.
That field is initialised to `None` at creation (`:276`) and only set by
`record_segment`. A session that never heartbeats is therefore immortal.

**EVIDENCE.** `streaming_session_manager.py:480-484` —
`last_seg = data.get("last_segment_at"); if not last_seg: continue`.

**DIVERGENCE.** The sweeper's stated purpose is *"the safety net for viewers who
crash, close their tab, or lose connectivity"* (`:463-467`). It has a hole exactly
where the net is most needed — the viewer who never got as far as playing. Three
routine paths land here: the 15-second setup timeout (`JubJub.ts:490-494`) gates
the UI while `attach()` continues in the background and still creates a session;
every retry click creates another; and any abandonment between session creation
and first segment leaves one behind. Each is an open on-chain session and, on
Tier 2, an endpoint that will hand out fresh signed media URLs forever (K1-4).

**FIX SKETCH.** Fall back to `created_at` when `last_segment_at` is null, so an
un-started session times out on the same 10-minute clock. Add the composite index
in the same commit. Consider a shorter timeout for zero-segment sessions — they
have no revenue to protect and their only effect is leaked state.

---

## K3-3 — The cost overlay is an unreconciled estimate that diverges from what settles — **MEDIUM**

**FINDING.** The overlay is computed entirely client-side from
`totalPlaybackSeconds × pricePerSecond` and is never compared with what the chain
actually pulled. It diverges from settlement in at least five independent ways.

**EVIDENCE.**
- `CostTracker.ts:89-97` — `usdc = seconds * this.pricePerSecond`, where
  `pricePerSecond` derives from the content price (`:32`).
- Divergence sources:
  1. **Price** — overlay uses the content's price; settlement uses the flat
     $0.005/min constant (K1-7). Whenever they differ, the overlay is simply wrong.
  2. **Granularity** — overlay accrues continuously; billing floors to whole
     6-second segments (`:331-333`).
  3. **Lost segments** — failed POSTs are swallowed (`:58`), but the overlay
     already counted them.
  4. **Cap** — past `MAX_SESSION_AMOUNT` the overlay keeps climbing while nothing
     is charged (K2-3).
  5. **Failed settle** — on K3-1 the viewer is charged **nothing** while the
     overlay showed a full session's cost.
- The SDK never calls `GET /v2/streaming/sessions/{id}`, which returns the
  authoritative `amount_settled`. `Session.ts` discards it from the create
  response.

**DIVERGENCE.** The overlay is the viewer's only view of what they are paying,
and it is a projection of intent rather than a report of fact. In every divergence
listed the overlay reads *higher* than reality, so no viewer is over-charged
relative to what they were shown — which is the right direction to be wrong, but
it means the number is closer to a price estimate than a meter.

**FIX SKETCH.** Reconcile periodically: poll the session endpoint on a slow timer
(every 30 seconds is ample), and display settled-plus-pending rather than a pure
client projection. Where they disagree materially, trust the server. Pinning the
price on the session document (K1-7) removes the largest divergence at the source.
If reconciliation is deferred, at minimum label the overlay as an estimate.

---

## K3-4 — Backgrounded tabs and elevated playback rates bill nothing — **MEDIUM**

**FINDING.** `CostTracker` discards any `timeupdate` delta above 2 seconds as a
seek. Two ordinary conditions produce such deltas during genuine playback.

**EVIDENCE.** `CostTracker.ts:7` — `MAX_NORMAL_DELTA = 2`; `:45-49` — only
`0 < delta <= 2` accumulates; everything else is silently dropped.

**DIVERGENCE.**
- *Backgrounded tab.* `timeupdate` normally fires every 66–250 ms, but browsers
  throttle timers heavily in hidden tabs while audio keeps playing. Once the
  inter-event gap exceeds 2 seconds, **every** delta is classified as a seek and
  the viewer accrues nothing while continuing to consume the content. Audio-led
  listening is the obvious real-world case.
- *Playback rate.* At 4×, deltas stay under 2 s and billing scales correctly with
  content consumed. At 8× and above, each delta exceeds 2 s and billing drops to
  zero. `controlsList="noplaybackrate"` in the mini-app
  (`index.html:930`) hides the control but does not restrict
  `video.playbackRate`, which any viewer can set from the console.

**FIX SKETCH.** Replace the fixed threshold with one derived from wall-clock:
compare the `currentTime` delta against elapsed real time × `playbackRate`, and
treat as a seek only when they disagree beyond a tolerance. That distinguishes a
genuine seek from a slow tick, which is the actual thing being detected. Add a
`visibilitychange` handler so a hidden tab settles what it has accrued rather than
drifting, and clamp `playbackRate` on gated content.

---

## K3-5 — Failure-path matrix

| Failure | Video | Billing | Recovery |
|---|---|---|---|
| **RPC down mid-playback** | keeps playing | accrues in Firestore; settle at close fails → **K3-1 terminal** | none |
| **`settle` reverts** | keeps playing | **nothing charged**, session `failed`, on-chain session leaks | none |
| **Backend 5xx on segment** | keeps playing | that segment lost silently | none (no retry) |
| **Allowance exhausted** | keeps playing | revert → terminal; no re-approve prompt | none |
| **USDC balance < amount** | keeps playing | revert → terminal | none |
| **Playback URL expiry (Tier 2)** | pauses, gate shown | accrual stops (paused ⇒ no `timeupdate`) | **correct — refresher + gate** |
| **Tab suspended** | continues (audio) | **accrues nothing** if ticks > 2 s apart | none |
| **Tab closed** | n/a | `beaconClose` → settle; unreliable on mobile Safari | idle cron at 600 s, unless zero segments (K3-2) |
| **Wallet disconnects** | keeps playing | undetected — `_sharedWallet` is cached and never invalidated | none |
| **Setup > 15 s** | gated (paused) | session still created in background → orphan | K3-2 blocks cleanup |

**Paths where the viewer pays without receiving playback:** none found. Every
failure biases toward the viewer. Worth stating plainly — it is the right default
and it is not accidental.

**Paths where playback occurs without payment:** Tier 1 with the SDK blocked or
absent; segment POSTs suppressed by a modified client; backgrounded tab with
throttled ticks; `playbackRate ≥ 8`; any settle failure (K3-1); past
`MAX_SESSION_AMOUNT`; and Tier-2 URL re-resolution without heartbeating (K1-4).
**Wallet disconnect** deserves separate mention: `_sharedWallet` is module-cached
and never invalidated, and TODO-SDK already flags the missing
`accountsChanged`/`chainChanged` listeners. A viewer who switches accounts
mid-session continues to be billed against the original wallet's allowance, which
is the one place the viewer-favourable bias breaks.

---

# K4 — VENDORED COPY DRIFT

## FINDING: zero drift today; no mechanism to detect it tomorrow

I rebuilt the SDK from current `src/` into a scratch directory (`npx vite build`,
vite 5.4.21, node 20.19.2, the repo's own `node_modules`) and compared all three
artefacts:

```
709e8c85f4287550fcf913c91f7de6ac  scratch/dist_fresh/jubjub-sdk.umd.js  (fresh build of src/)
709e8c85f4287550fcf913c91f7de6ac  jubjub-sdk/dist/jubjub-sdk.umd.js     (committed)
709e8c85f4287550fcf913c91f7de6ac  farcaster_miniapp/jubjub-sdk.umd.js   (vendored)
```

All 304,778 bytes, byte-identical. **There are no behavioural differences to
report.** The build is reproducible and the vendored copy is current as of
`0511e22`.

Three caveats that make this a snapshot rather than a guarantee:

- **The only version marker in the deployed system is wrong.**
  `farcaster_miniapp/index.html:300` says *"JubJub streaming SDK (same-origin UMD,
  **v1.2.3**)"*. No such version exists — `package.json` is `1.0.0`,
  `SDK_REFERENCE.md` says `1.0.0`, and TODO-SDK still lists the bump to 1.0.1/1.1.0
  as outstanding. A hand-written HTML comment is the entire drift-detection story,
  and it is already inaccurate.
- **The cache-buster is a hand-edited string.** `index.html:305` loads
  `jubjub-sdk.umd.js?v=overlayfix`. Re-vendoring without editing that string
  leaves viewers on a cached old bundle with no way to tell.
- **A third, stale copy exists at `~/Documents/Code/jubjub-sdk.umd.js`** — 295,537
  bytes, dated 2026-04-14, hash `3ab3c33774eb…`, alongside `sdk-test.html`. It is
  outside every repo and predates the mainnet default, the bounded approval, all
  the fail-closed work, Tier 2 and the standing allowance. If anything still
  points at it, that consumer is running the pre-security SDK. Worth deleting or
  moving into the repo as an explicit fixture.

## FIX SKETCH — cheapest version-marker scheme

Inject the identity at build time and surface it once at runtime. In
`vite.config.ts`, add a `define` block replacing `__JUBJUB_BUILD__` with a literal
composed of `package.json`'s version and the short git SHA (both available from
`process.env`/`child_process` at config evaluation, which runs in node). Export it
as a static `JubJub.version` and log one line from `init()` next to the existing
`[JubJub] init() called` at `JubJub.ts:222`. Total cost: about six lines and no
new dependency.

That gives three things at once: drift is visible in any deployed mini-app's
console; a support conversation can start with "what does the console say" instead
of a byte diff; and the constant changes on every build, which makes it a natural
cache-buster — reference `?v=` + the same value instead of hand-editing
`overlayfix`. Pair it with a CI check that rebuilds and fails if `dist/` differs
from the build output, so the committed bundle can never silently lag `src/`
(TODO-SDK already has this as "BUILD INFRA"; the version constant is what makes
the check legible when it fires).

---

# K5 — INTEGRATION SURFACE AND DOCS

## K5-1 — Both documents are four feature-generations stale, and wrong in ways that matter

`README.md` and `SDK_REFERENCE.md` were both last touched on **2026-06-15**
(commit `da4a25c`, the network-flag work). Since then: mainnet default (`f6a88ba`,
06-24), fail-closed gating (`677fbd5`, `3b792b1`, 06-24), Tier-2 gated playback
(`61b2d61`, 06-29), standing allowance (`c7cfecc`, 06-29), `overlayPosition`
threading (`0511e22`, 07-03). None of it is documented.

| Doc claim | Reality |
|---|---|
| *"`network: 'testnet'` (Base Sepolia, **default**)"* — README:132, SDK_REFERENCE:4, :5, :263, :307, :374 | Default is **`'mainnet'`**. `JubJub.ts:28` `_initNetwork = 'mainnet'`; `DEFAULTS` at `:70`. Stated wrongly **six times** across the two files. |
| *"Viewers without a wallet extension see no prompts — **videos play free**"* — README:35 | False since `677fbd5`. No wallet → gate B → `_gatePayment('Connect a wallet to watch')` (`JubJub.ts:709-715`). The video stays paused behind a retry gate. |
| *"JubJub **never touches** the video source"* — SDK_REFERENCE:14 | True for Tier 1 only. Tier 2 assigns `video.src` at `JubJub.ts:795` and again on every refresh at `PlaybackUrlRefresher.ts:207`. |
| *"[Base Sepolia]"* in the How-It-Works diagram — README:96 | Mainnet. |
| Events list — README:141-152 | Omits **`payment:required`**, the event an embedder must handle to gate their own element. TODO-SDK flags this as a breaking change for direct `JubJub.play()` embedders; the README never mentions it. Also omits `content:loaded` from the type surface and `approved` is present but undocumented in `JubJubOptions`. |
| `JubJub.init()` config | Undocumented as a shape. `streamingAllowanceUsd` and `provider` — the two options a Farcaster/mobile integrator **must** set — appear in neither document. `provider` is the difference between working and not working inside a mini-app. |
| `overlayPosition` | Documented only as a `new JubJub({...})` option (README:135). The `init()` path added in `0511e22` — the only path that works for auto-discovered videos — is undocumented, which is precisely the gap that commit was fixing. |
| Contract addresses table | Base Sepolia, labelled "for reference only", with mainnet addresses absent. |

**FIX SKETCH.** A single pass over both files correcting the default-network claim
(six sites), deleting the "play free" sentence, qualifying "never touches the video
source" with the Tier-2 exception, and adding an `init()` options table with
`platformKey`, `apiUrl`, `network`, `provider`, `streamingAllowanceUsd`,
`overlayPosition`, `showCostOverlay`. Add `payment:required` to the events list
with a worked example of gating a `<video>`, since that is the one thing a
manual-integration embedder gets wrong by default. Given the two documents overlap
heavily and drift independently, consider making SDK_REFERENCE the single source
and reducing README to quick-start plus a link.

## K5-2 — The host-integration contract, and what a third party can misconfigure silently

**What a third party must do:** load the UMD bundle; call
`JubJub.init({ platformKey })`; add `data-jubjub-content-id` (pre-registered) or
`data-jubjub-creator` (auto-register) to a `<video>`. That is genuinely two lines,
and the auto-discovery path (`JubJub.ts:353-388`, with a MutationObserver for SPAs)
works as advertised.

**What they can misconfigure with no error:**

| Misconfiguration | Symptom | Why it's silent |
|---|---|---|
| Omit `provider` in an embedded/mobile context | Wallet never connects → every video gated | `connectBrowserWallet` falls back to `window.ethereum`, absent in mini-apps. Only the gate copy surfaces, which reads as a viewer problem. |
| Set `overlayPosition` on `play()` for auto-discovered videos | Silently ignored pre-`0511e22`; correct now | Auto-discover never passes per-video options. Fixed, undocumented. |
| Ship the platform key in the page (the documented pattern) | Full account compromise | **K1-5.** No warning anywhere. |
| Register content at an arbitrary price | Viewer quoted one price, charged $0.005/min | **K1-7.** No validation, no warning. |
| Attach to a `<video>` whose `src` is set after arming | Race — video may play free | Mini-app works around it with `ARM_DELAY_MS = 650` (`index.html:758`) tuned against the SDK's internal 100 ms debounce. An undocumented internal constant is load-bearing for a consumer. |
| Call `JubJub.play()` manually without listening for `payment:required` | Video plays free on every payment failure | The auto-discover harness gates; a manual embedder gets no gating unless they build it. |
| Two videos on one page | Two sessions, two `createSession` txs, neither closed | **K2-4.** |

The `data-jubjub-price` attribute is documented (README:44) as a "price per minute
override" and, per K1-7, is never charged.

**FIX SKETCH.** Make the SDK loud where it is currently silent: warn on `init()`
when no `provider` is supplied and `window.ethereum` is absent; warn when
`overlayPosition` is passed to `play()` for a video that came from auto-discovery;
and warn once when `platformKey` is used from a browser context, pointing at
server-side registration. Replace the `ARM_DELAY_MS` race with an explicit
`JubJub.attachTo(video)` the consumer can call after setting `src`, so no one has
to guess a debounce constant.

## K5-3 — Builder-code `dataSuffix` on the viewer approve: confirmed absent

**FINDING.** The viewer's `USDC.approve` — the only transaction the SDK causes the
viewer's own wallet to send — carries no ERC-8021 attribution suffix. It is
therefore unattributed to JubJub's Base builder code.

**EVIDENCE.** `Approval.ts:201-206` — `client.writeContract({ address, abi,
functionName: 'approve', args })`. No `dataSuffix`. viem's `writeContract` accepts
`dataSuffix` and appends it to the encoded calldata, so the extension point exists
and is unused. Backend operator transactions **do** carry the suffix — see
`builder_code.py:76-89` (`append()`) — so the platform is attributed for
`createSession`/`settle`/`closeSession` but not for the one viewer-originated tx.

**Not making the change**, per the read-only scope. Shape of the fix: hardcode the
16-byte marker `80218021802180218021802180218021` preceded by the schema byte
`0x00`, the single-byte code length, and the ASCII builder code — exactly the
layout `build_suffix()` produces — as a constant in the SDK, and pass it as
`dataSuffix` on the `writeContract` call at `:201`. One constant plus one property.
Two caveats worth noting before it ships: the backend's suffix is gated on the
`BASE_BUILDER_CODE` env var, which per project memory is still unset, so the code
value needs settling first; and the SDK ships to third-party browsers and cannot
read env vars, so the value must be baked into the bundle at build time — the same
`define` mechanism proposed for the version constant in K4 carries it for free.

## K5-4 — TODO-SDK.md triage

| Item | Status |
|---|---|
| DONE block (allowance/RPC, mainnet default, bounded approval, fail-closed, Basescan verify, on-chain proof) | **Accurate.** All verified present in code. |
| Version bump 1.0.0 → 1.0.1/1.1.0 | **Still valid, now overdue.** `package.json` is `1.0.0` across five feature commits, and the mini-app claims a fictional `v1.2.3`. Blocks K4. |
| Changelog noting breaking changes | **Still valid, and understated.** Also needs Tier-2 and standing-allowance entries. |
| *"Commit the untracked `dist/*.d.ts`"* | **DONE — obsolete.** `git ls-files dist` shows all ten `.d.ts` files tracked. |
| npm publish vs UMD-only | **Still valid, unanswered.** |
| GitHub Pages branch/folder confirmation | **Still valid.** `sdk_routes.py:742` hardcodes `https://jubjub-app.github.io/jubjub-sdk/dist/jubjub-sdk.umd.js` in the developer-signup snippet, so this is load-bearing for onboarding. |
| GitHub Action to build in CI | **Still valid.** Directly enables the K4 drift check. |
| Payload validation (#6) | **Partially done.** Price is validated at `JubJub.ts:691-699`; `chain_id` at `Approval.ts:98-103`; `usdc_address` gets a bytecode preflight at `:167-173`. `payment_router` is still unvalidated. Narrow the item rather than closing it. |
| Stale-connection handling (#8) | **Still valid, and now a correctness issue** — see K3-5 wallet-disconnect row. Should be promoted out of "hardening". |
| Embedder RPC override | **Still valid.** `chains.ts:38-42` documents the public-RPC tradeoff honestly; the SDK reads allowance and waits for receipts through `mainnet.base.org`, which is rate-limited. |
| Real event API (*"`JubJub.on(...)` does not exist"*) | **Obsolete as written.** `EventEmitter` is in place and `sdk.on(...)` works on the instance returned by `play()`. The real remaining gap is that the events are undocumented (K5-1), not absent. Rewrite the item. |
| Connector ladder + prerequisites | **Still valid.** Unchanged. |
| Operational runbook (verify + Blockaid on every deploy) | **Still valid, recurring.** |
| Delete `docs/proposals/treasury-wallet-switch.md` | **Still valid** — the file is still present in `movie_system_jubjub/docs/proposals/`. |
| Fail-open vs fail-closed | **DONE.** Resolved to fail-closed and implemented. |

**Missing from TODO-SDK entirely:** everything in K1. The document tracks build
mechanics and UX polish and contains no security items, which — given that the
top three findings in this audit are unauthenticated credential minting,
unauthenticated session creation, and a published full-privilege API key — is the
most significant gap in it.

---

# K6 — TESTS

Zero exist in this repo (no test runner, no `test` script, no `*.test.ts`). The
five below are ordered by expected defects caught per hour of work. Four of the
five need only vitest plus a mocked `ApiClient` and a fake `<video>`; only the
last needs a chain.

**1. `CostTracker` accrual and segment emission — vitest + mocked ApiClient.**
Drive a stub video element through synthetic `timeupdate` sequences and assert
one `recordSegment` per 6 accumulated seconds. Cases: normal playback; backward
seek (must not subtract); forward seek (must not accrue); **a 3-second tick,
which currently accrues nothing and is the K3-4 backgrounded-tab bug**;
`playbackRate` 4 and 16. This is the cheapest test in the list and it pins the
one module that decides how much money changes hands.

**2. `Approval` bound arithmetic — vitest, pure functions.**
`_boundedSessionAmount` and `_boundedStandingAllowance` are static and take
numbers. Assert: NaN/undefined/zero/negative price → `$2` floor; default → `$10`;
configured `$600` → clamped to `$500`; **`price_per_minute = 100` → currently
returns `$12,000`, which is the K1-6 ceiling bypass**; and the reuse threshold
(`isApproved` gates on `sessionBound`, not the standing amount, so partial
drawdown must not re-approve). Pure functions, no mocks, immediate payoff.

**3. Fail-closed gating decision table — vitest + mocked ApiClient + fake video.**
For each failure injected at each of the six `attach()` steps — playback-info
throws, price invalid, wallet unavailable, viewer-session fails, approval
rejected, streaming-session fails, Tier-2 URL fails — assert `payment:required`
is emitted and `video.play()` is **never** called. This is the invariant three
separate commits were written to establish (`677fbd5`, `3b792b1`, `bac2b00`) and
nothing currently protects it; it is also the invariant most likely to be broken
by an unrelated refactor of the `attach()` chain.

**4. Server-side trust boundary — pytest against the backend, mocked Firestore + web3.**
Belongs in `movie_system_jubjub`, but it is the highest-value test in this
document. Assert: `POST /v2/public/viewer-session` for a wallet the caller cannot
prove is theirs is refused (K1-1 — this test **fails today** and should be written
first as the regression guard for the fix); `create_streaming_session` ignores a
client-supplied `viewer_wallet` (K1-1 — passes today, must keep passing);
`playback_seconds` never affects `amount_settled` (K1 — passes today);
`segment_count * 6` cannot exceed wall-clock elapsed (K1-3 — fails today);
`settle_session` bills at the content's price, not the constant (K1-7 — fails
today); a failed settle leaves the session retriable rather than terminal (K3-1 —
fails today).

**5. Router settle semantics — hardhat, local fork.**
The only one needing a chain. Assert the rate cap boundary (settle at exactly
`200000 * elapsed / 60` succeeds; one unit more reverts `ExceedsMaxRate`), that
`elapsed` runs from `createdAt` so a single large settle at close is legal at
honest rates (the assumption K2-1 rests on), `ExceedsSessionCap` at `maxAmount`,
`InsufficientAllowance` when the standing allowance is drawn down by a prior
session, and that `notifyDistribution` splits 97/3 with catalogue auto-forward.
`Onchain/test/` already has the harness — this is an added file, not new infra.

---

# (a) Revenue-critical — pull into Phase B of the stabilisation plan

Four items. The first three are money leaving or failing to arrive; the fourth is
money being counted wrong.

1. **K1-1 + K1-2 — unauthenticated session-token minting and arbitrary-content
   session creation.** Together these let an anonymous party drain any wallet that
   has approved the Router, toward content they control, bounded only by that
   wallet's standing allowance. They also expose an unauthenticated operator-gas
   DoS that would stall minting and settlement platform-wide. Nothing else in this
   document is as urgent. The scope-restriction half of the fix is small and can
   ship ahead of the signature work.

2. **K3-1 — failed settles are terminal with no recovery.** Combined with K2-1
   (everything settles at close), any transient RPC or nonce problem destroys a
   whole session's revenue silently and leaks an on-chain session. There is no
   metric that would show this happening. The x402 rail already has the recovery
   pattern to copy.

3. **K1-5 — the platform key is a full profile credential, published in every
   integrator's page.** The mini-app's key is compromised by publication and should
   be rotated as part of the fix, not after it.

4. **K1-7 — content price is displayed and approved against but never charged.**
   All streaming bills at a flat $0.005/min. Every creator with a non-default price
   is being paid the wrong amount today, in a direction that depends on their
   setting. Cheap to fix and it is the prerequisite for the overlay ever being
   accurate.

---

# (b) Everything else, severity-ordered

| # | ID | Finding | Severity |
|---|---|---|---|
| 5 | K1-3 | Segment count unverified; no wall-clock bound (host can inflate to 40×) | HIGH |
| 6 | K1-4 | Tier-2 signed URLs issued on session existence, not payment progress | HIGH |
| 7 | K2-2 | Allowance exhaustion mid-session → terminal failure, no re-approve prompt | HIGH |
| 8 | K3-2 | Zero-segment sessions never closed; immortal + keep serving gated URLs | HIGH |
| 9 | K2-1 | No periodic settlement; `SETTLE_INTERVAL_SECONDS` dead; docstrings wrong | HIGH |
| 10 | K1-6 | `price_per_minute` unbounded server-side; ceiling bypassed in `Approval` | HIGH |
| 11 | K5-1 | README + SDK_REFERENCE four generations stale; default network wrong ×6; `payment:required` undocumented | MEDIUM-HIGH |
| 12 | K2-4 | Session per clip, never closed on transition; 3 operator txs per clip | MEDIUM |
| 13 | K3-4 | Backgrounded tab and `playbackRate ≥ 8` bill nothing | MEDIUM |
| 14 | K3-3 | Cost overlay diverges from settlement five ways, never reconciled | MEDIUM |
| 15 | K2-5 | Segment posts have no retry and no idempotency key | MEDIUM |
| 16 | K3-5 | `_sharedWallet` never invalidated on account switch — billing follows the wrong wallet | MEDIUM |
| 17 | K2-3 | `MAX_SESSION_AMOUNT` → silent free playback; SDK unaware of the cap | MEDIUM (latent) |
| 18 | K4 | No build/version marker; mini-app comment claims a non-existent v1.2.3 | MEDIUM |
| 19 | K5-2 | Silent misconfigurations: missing `provider`, `ARM_DELAY_MS` race, unlistened `payment:required` | MEDIUM |
| 20 | K3-5 | 15 s setup timeout gates the UI while `attach()` creates a session anyway | LOW-MEDIUM |
| 21 | K5-3 | Builder-code `dataSuffix` absent on the viewer approve — unattributed | LOW |
| 22 | K4 | Stale `~/Documents/Code/jubjub-sdk.umd.js` (2026-04-14, pre-security) outside all repos | LOW |
| 23 | K1-2 | Dead `payment_rules_v2` gate in `_create_session_inner` — condition can never fire | LOW |
| 24 | K5-4 | TODO-SDK contains no security items at all | LOW (process) |

---

## Closing note

The failure-handling work in this SDK is genuinely good. The fail-closed
refactor is thorough — seven distinct failure points each gated with viewer-facing
copy, no free-play fallthrough anywhere, and `PlaybackUrlRefresher` refuses to
touch a durable URL even on the retry path. The standing-allowance design
correctly decouples the reuse threshold from the approve amount, and the chain
resolution was deliberately re-sourced from `chain_id` so the RPC and the contract
addresses cannot diverge. Comments explain *why* rather than *what*, which is rare
and worth keeping.

The gap is not craft, it is placement. Almost all of that care sits on the client,
where an attacker is not. The three critical findings are all on the server side
of the boundary — a public endpoint that mints credentials without proof, a
session-create that will charge any wallet toward any contract, and an API key
documented as public that behaves as a password. None requires a rewrite; each is
a bounded change to one handler, and the codebase already contains the correct
pattern for two of them (`register-viewer`'s SIWE check, and the x402 settlement
recovery worker). Phase B is mostly a matter of applying patterns you have already
written, one file over.
