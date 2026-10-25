# JubJub SDK Reference

**Version:** 2.4.1
**Chain:** Base (Coinbase L2) — `network: 'mainnet'` → Base mainnet (default), `network: 'testnet'` → Base Sepolia
**Status:** Live on Base mainnet. Omitting `network` means mainnet; pass `network: 'testnet'` to develop against Sepolia.

---

## What it does

JubJub SDK adds pay-per-view streaming payments to any video on any website. Two lines of code. No crypto knowledge required from the developer. Revenue flows directly to the content creator on-chain via USDC stablecoin.

JubJub handles the money stream, not the video stream. Video serves from the platform's own CDN. JubJub never touches the video source.

---

## Who it's for

**Platforms and news organisations:** Add this to your website. Every video your journalists upload generates direct revenue for them. You take a cut. Zero crypto knowledge required.

**Developers:** Two lines of code. Any video gets pay-per-view. Payments route on-chain to the creator.

**Creators:** You already publish on YouTube. JubJub makes you money everywhere else.

**Investors:** Infrastructure layer for media payments. Every video player is a potential revenue stream. JubJub takes 3%.

---

## Integration

### Backend: register content (one API call per video)

```javascript
const res = await fetch('https://api.jubjubapp.com/v2/platform/register-content', {
  method: 'POST',
  headers: {
    'X-JubJub-Platform-Key': 'pk_your_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    creator_email: 'jane@newsorg.com',
    title: 'Breaking News Coverage',
    media_url: 'https://cdn.newsorg.com/video.mp4',
  }),
});
const { content_id } = await res.json();
```

### Frontend: two lines

```html
<video id="player" src="https://your-cdn.com/video.mp4" controls></video>
<script src="https://jubjub-app.github.io/jubjub-sdk/stable/jubjub-sdk.umd.js"></script>
<script>
  JubJub.play('cnt_abc123', document.getElementById('player'));
</script>
```

That's it. `stable/` moves only after a release has passed the full test
suite. To pin a version, load
`https://jubjub-app.github.io/jubjub-sdk/v/2.4.1/jubjub-sdk.umd.js` instead.
The older `.../jubjub-sdk/dist/jubjub-sdk.umd.js` address is legacy (main's
unpinned build output); it keeps working, but new integrations load `stable/`
or `v/<version>/`.

---

## What happens when a viewer presses play

1. SDK fetches payment config from JubJub API (public endpoint, no auth). The video is paused until payment is in place (fail closed)
2. Wallet connect prompt appears (MetaMask, Coinbase Wallet, Rainbow), then one free signature per page proves the wallet
3. USDC allowance checked against the streaming spender (`payment_router` in playback-info). The viewer approves a standing allowance (their pot, $10 by default) only when the current one is below $0.50, the backend's floor; with $0.50 or more approved they are never asked, on any site
4. Streaming session opens. The backend refuses (402) when allowance or balance is below its floor or a tab is unpaid; the gate shows what to do, and the approve button asks for exactly the backend's figure
5. Cost overlay appears on the video: `$0.0042 · 0:42 · Powered by JubJub`
6. Heartbeat fires every 6 seconds of playback, and every answer is read: a session the backend closed is never metered again
7. Video pauses: payments pause; nothing accrues however long the pause. Seek backwards: cost stays (accumulative). Seek forward: no charge for skipped content. A backgrounded tab is charged for the time that actually played
8. Video ends: the session closes at once with the seconds played and charging stops. Play again (this video or another) and a session reopens quietly from the same pot, no prompt unless the pot cannot cover it
9. A session reaches its $2.00 cap: the backend closes it and the SDK quietly opens a new one from the same pot while the video keeps playing; if the pot cannot cover the new session the video pauses under the payment prompt
10. Tab closes: a beacon closes the session with the exact playback seconds and settlement happens on-chain. Hiding the tab closes the session only while the video is paused or ended; play after a closed session opens a new one first
11. USDC flows: viewer -> streaming spender -> content contract -> catalogue -> creator

---

## Revenue flow

**Example: viewer pays $1.00**

| Recipient | Amount | Mechanism |
|---|---|---|
| JubJub | $0.03 (3%) | Taken by the creator pool when a crossing settles |
| Content contract | $0.97 | On-chain transfer |
| Catalogue | $0.97 | Auto-forwarded from content contract |
| Creator A (70% brand token) | $0.679 | Proportional to brand token holdings |
| Creator B (30% brand token) | $0.291 | Proportional to brand token holdings |

Revenue streams across JubJub:

| Stream | Creator share | JubJub share |
|---|---|---|
| Streaming payments | 97% | 3% |
| Metadata search | 0% | 100% |
| Data feeds | 10% | 90% |

There is no secondary market. Brand token units are transferable on chain
(see "On-chain token architecture" below), but JubJub offers no marketplace or
trading for them and takes no fee on a transfer.

---

## Two SDK layers

### Layer 1 — Player SDK (frontend)

Attaches to any HTML5 `<video>` element. Handles wallet connection, USDC approval, streaming payments, cost tracking, and settlement. The video serves from the platform's own CDN. JubJub never touches the video source, never hosts media, never transcodes.

### Layer 2 — Platform SDK (backend)

Registers content on JubJub from any platform's backend. Creates creator profiles, ingests media for provenance hashing, deploys ownership tokens on-chain. All server-to-server. No browser session required.

---

## API endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /v2/platform/register-content` | `X-JubJub-Platform-Key` | Register video, create ownership tokens |
| `GET /v2/public/contents/{id}/playback-info` | None (public) | Payment config for SDK player |
| `POST /v2/public/viewer-session` | None (public) | Session token for viewer |
| `POST /v2/platform/keys` | Firebase Bearer | Generate platform API key |

Base URL: `https://api.jubjubapp.com`

### Register content request

```json
{
  "creator_email": "jane@newsorg.com",
  "creator_wallet": "0x...",
  "title": "Breaking News Coverage",
  "description": "Optional description",
  "media_url": "https://cdn.newsorg.com/video.mp4",
  "price_per_minute": 0.005,
  "platform_name": "newsorg",
  "platform_video_id": "vid_123",
  "platform_video_url": "https://newsorg.com/watch/vid_123",
  "metadata": {}
}
```

Required: `media_url` and at least one of `creator_email` or `creator_wallet`.

### Register content response

```json
{
  "content_id": "cnt_abc123",
  "profile_id": "uid_xyz",
  "workspace_id": "ws_def456",
  "media_id": "med_ghi789",
  "ownership_status": "minting",
  "catalogue_address": "0x...",
  "creator_is_new": true,
  "content_hash": "sha256...",
  "message": "Content registered. Ownership tokens deploying."
}
```

### Playback info response

```json
{
  "content_id": "cnt_abc123",
  "title": "Breaking News Coverage",
  "price_per_minute_usdc": 0.005,
  "content_contract": "0x...",
  "payment_router": "0x...",
  "usdc_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "chain_id": 8453,
  "chain_name": "base"
}
```

> Production is Base mainnet, so this is what live content returns. The
> SDK resolves its RPC from `chain_id`; content on the Base Sepolia testnet
> would return `chain_id: 84532` (`base-sepolia`) with its own addresses.
>
> `payment_router` carries the **streaming spender**: the address the
> viewer's USDC allowance is granted to and that the backend draws against
> (`sdk_routes._streaming_spender`). That is the JubJubCreatorPool; the
> field name is historical (it once named the JubJubPaymentRouter, whose rail
> was retired on 2026-10-25). It is the same address a 402 names as
> `spender`, so Step 3's approval and a 402's request always point at one
> contract.

---

## Creator identity resolution

The platform provides an email, wallet address, or both. JubJub resolves in order:

1. Wallet match — `profiles.wallet_addresses` array-contains
2. Email match — `profiles.email` equals
3. No match — create new Firebase user and JubJub profile

The creator never needs a JubJub account. A lightweight profile is created silently. If they later sign up on JubJub with the same email or wallet, everything is already there.

---

## Content hash and dedup

During registration, JubJub:

1. Downloads the video temporarily
2. Computes SHA-256 hash during download (streaming, not buffered)
3. Rejects registration if the hash already exists in the system
4. First registrant wins — timestamp on the content token is the priority proof
5. Deletes the file after hashing (or cold storage for disputes)

This prevents multiple ownership claims on the same media.

---

## On-chain token architecture

Three layers, each an ERC-1155 on Base:

```
Brand Token (ERC-1155 token id 1, 10,000 units per catalogue)
  Represents proportional ownership of ALL content revenue.
  Example: Creator A 7,000 / Creator B 3,000
  Units are transferable on chain like any ERC-1155. JubJub offers no
  marketplace or trading, and JubJub's records (the splits and holders
  its dashboard shows) do not follow a transfer. On chain, revenue
  that arrives after a transfer is claimable by the new holder.
     |
     v
Catalogue Contract (one per team or solo creator)
  Holds all content tokens. Receives revenue via auto-forward.
  Distributes to brand token holders proportionally.
     |
     v
Content Token (10,000 supply per video)
  Created per video. All held by catalogue.
  Receives streaming revenue from the creator pool.
  Auto-forwards to catalogue in the same transaction.
```

### Payment flow on-chain

```
Viewer USDC (a standing approval to the creator pool)
  -> JubJubCreatorPool, a crossing pulls what was watched
    -> 3% to JubJub treasury
    -> 97% to Content Contract via notifyDistribution()
      -> auto-forward to Catalogue (same tx)
        -> accumulator updates
          -> brand token holders withdraw proportionally
```

### Smart contracts (Base mainnet)

Production runs on Base mainnet (chain `8453`). The SDK does not hardcode
these addresses: the backend playback-info response supplies
`payment_router`, `usdc_address` and `chain_id` per content.

| Contract | Address (Base mainnet) |
|---|---|
| JubJubCreatorPool (the streaming spender) | `0xD3b220ebd563d2309977f0442dD4746d4bAe3dC8` |
| JubJubPaymentRouter (retired rail, 2026-10-25; still the content tokens' `router` role, never approved) | `0x8dcD41b8FaC4dD6dE3FD2e5A32962B3d93DbC9Da` |
| MediaOwnershipFactoryV2 | `0xab217aa8428c24Dde73cf334aF650a290E52d81C` |
| JubJubCatalogueFactory | `0xc5B533F9d2977d7e7Dc47dBE780BFA367E131e1B` |
| JubJubPublishLedger | `0x3EC31c79a0b73FfA49f1868F5Ec6bd54D1588Aa6` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

---

## SDK configuration

```javascript
const sdk = new JubJub({
  wallet: myWalletClient,          // BYO viem WalletClient, or null for prompt
  apiUrl: 'https://api.jubjubapp.com',
  network: 'mainnet',             // 'mainnet' (Base, default) or 'testnet' (Base Sepolia)
  showCostOverlay: true,           // default true
  overlayPosition: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  onCostUpdate: (cost, seconds) => {},
  onSessionStart: (sessionId) => {},
  onSessionEnd: (summary) => {},
  onError: (error) => {},
  onWalletConnected: (address) => {},
  sessionToken: 'jj_...',          // optional: a session the host already holds (see below)
  payerMode: 'auto',               // 2.4.0: 'auto' | 'wallet' | 'card' (see The JubJub card)
  onSelectCard: (cards) => {},     // 2.4.0: optional, when several cards qualify
});

await sdk.attach('cnt_abc123', videoElement);
```

### One signature per page, not per video

By default the SDK proves wallet ownership once per video: on play it fetches
a nonce, asks the wallet to sign it, and mints a viewer session token. From
2.1.0 that token is shared across every video on the page, so the second
video never prompts. A host page that signs the viewer in itself (SIWE via
`POST /v2/auth/register-viewer`) can hand its session token over and the SDK
skips the signature step entirely:

```javascript
JubJub.init({ platformKey: 'pk_...', sessionToken: 'jj_...' });
// or, after init, when the viewer signs in:
JubJub.setSessionToken('jj_...');
```

The SDK never persists the token. If the backend refuses it (expired, revoked)
the SDK forgets it and the next play resumes the remembered sign-in (2.5.0) or
proves the wallet again.

### Remembered sign-in, 30 days per site (2.5.0)

A viewer is asked to prove their wallet once per site, not once per page:

- **First visit.** On a wallet that supports it (Coinbase Wallet, Base
  Account), connecting and signing in are one prompt (`wallet_connect` with
  `signInWithEthereum`). Any other wallet: connect, then the sign-in
  signature straight after, in the same step. A card holder then watches; an
  approve-and-pull viewer approves USDC once, as before.
- **Later visits within 30 days.** No prompt. At sign-in the SDK made a P-256
  key with WebCrypto (private half non-extractable) and kept it in this
  site's IndexedDB; the backend stored only its public half against the
  wallet and this site. A returning play signs a fresh timestamp with it
  (`POST /v2/public/viewer-session/resume`) and gets a viewer token.
- **Asked again** after 30 days, when the viewer switches wallet or
  disconnects the site in the wallet (`accountsChanged`), after
  `JubJub.resetWallet()`, or when the site's data is cleared. Each of these
  forgets the key here and on the backend.
- The token itself is never stored. The remembered sign-in only works on the
  site that made it: IndexedDB is per origin, and the backend refuses a
  resume whose Origin differs. What a token can spend is unchanged: a card is
  held by its per-card debit allowance and the holder's freeze, a wallet by
  its USDC approval.
- `JubJub.init({ rememberSignIn: false })` turns it off (sign each visit). A
  host that passes its own `sessionToken` skips all of this, as before.

### Switching wallet providers

`JubJub.init({ provider })` may be called again with a different EIP-1193
provider (for example injected first, WalletConnect later). Call
`JubJub.resetWallet()` first so the page-shared wallet from the previous
provider is forgotten; otherwise the SDK keeps signing with it.

### Several wallets, and what the gate says when the wallet refuses (2.1.3)

With more than one wallet extension installed, `window.ethereum` is whichever
one injected last, or a multiplexer that forwards each request to a wallet of
its own choosing. `eth_requestAccounts` could then be answered by one wallet
and `personal_sign` by another, which refuses with EIP-1193 4100 ("The
requested account and/or method has not been authorized by the user"); the SDK
reported that as "Payment service unavailable". Since 2.1.3:

- The SDK discovers wallets with EIP-6963 at `init()` and uses, in order: the
  host's `init({ provider })`; the wallet whose `rdns` matches
  `init({ walletRdns: 'io.metamask' })`; the only wallet; the one already
  connected to this site; else `window.ethereum` with a console warning that
  names every candidate (`[JubJub] Wallet provider: ...`).
- After `eth_requestAccounts` the SDK confirms with `eth_accounts` that this
  origin is authorised for the returned account, and checks again on the same
  provider before every signature. Not authorised: one reconnect prompt, then
  the gate says "Connect your wallet to this site" with a Connect wallet
  button, and the retry reconnects instead of signing with the same account.
- Wallet refusals are named: 4001 "You cancelled the request"; 4100 "Connect
  your wallet to this site"; -32002 "Wallet request waiting"; a wrong network
  "Switch your wallet to Base". "Payment service unavailable" is shown only
  when a JubJub backend call failed (`ApiHttpError`).
- A 409 from session create because the piece has no live ownership contract
  yet is "This video isn't ready for paid streaming yet"
  (`ContentNotPlayableError`), not a service outage.

`classifyWalletError`, `walletGateMessage`, `ContentNotPlayableError` and
`contentNotPlayableMessage` are exported for hosts that render their own gate.

2.1.4: a wallet with a stale connection record answers `eth_requestAccounts`
from its cache with no popup while `eth_accounts` lists nothing for the site
(measured on bankrtv.app with a single MetaMask). When the two disagree the
SDK now asks for a fresh permission with `wallet_requestPermissions` (the
wallet's connect dialog) and reads `eth_accounts` again; the account the
wallet then lists is the one used. If it is still empty the gate says
"Reconnect your wallet to this site": open the wallet, disconnect the site,
reload. The gate's button runs the same sequence. `requestAuthorisedAccount`
and `reconfirmAuthorisedAccount` are exported.

2.1.5: `POST /v2/streaming/sessions` answers 409 with a machine-readable body
`{reason, content_id, message, ...}` when the piece cannot be streamed for
money. `reason: "ownership_pending"` (no ownership contract yet; the body
also carries `ownership_status` and `ownership_reason`) and
`reason: "content_not_sellable"` both map to `ContentNotPlayableError`, and
the gate says "This video isn't ready for paid streaming yet" (or "watched on
its own platform" when JubJub holds no file). The older backend's bare 400
"has no ownership contract deployed" is read the same way, so the page never
calls that a payment-service outage.

2.1.6 (audit fixes, 2026-10-24):

- Any 402 from session create or URL refresh whose body carries a reason or a
  message is a `FundingRequiredError`. A reason this bundle predates parses
  with `reason: 'unknown'`, `backendReason` and `backendMessage`, and the gate
  shows the backend's message as its title with a "Try again" button; the
  page token is kept (a 402 is a funding refusal, not an auth failure). Before
  this a new reason read "Payment service unavailable" and forgot the token.
- Hiding the tab closes the session only while the video is paused or ended.
  Whenever play resumes after the session was closed, the SDK pauses, opens a
  new session (`disconnect()` then `attach()`, wallet and token held) and
  resumes from the same position once it is open; a refusal is gated with
  the backend's words.
- `CostTracker` detects seeks from `seeking`/`seeked` and bounds each
  `timeupdate` delta by the wall clock that passed (times the playback rate)
  instead of dropping every delta over 2 seconds, so a background-throttled
  tab is charged for the time that played and a jump is never credited.
- `showCostOverlay` is typed on `JubJubInitConfig`; the dead Privy import
  left `Wallet.ts`; `payment_router` documented as the streaming spender.

2.2.0 (the pot model, Tom, 2026-10-24). A viewer approves once; that approval
is their pot; they are asked again only when the pot cannot cover viewing. The
dashboard's /watch and /embed behave identically.

- Pre-flight approval only below the floor. Before opening a session the SDK
  reads allowance(viewer, spender) and approves only when it is below
  $0.50 (`PREFLIGHT_FLOOR_MICRO`, mirroring the backend's
  `FUNDING_FLOOR_MICRO`). Before, the threshold was max($2, price x 120 min),
  so a viewer who had approved $1 on the studio was asked again here. The
  standing amount ($10, `streamingAllowanceUsd`, capped at $500) is unchanged
  and never below the floor. A 402 still drives exact approvals through
  `required_micro` and `spender`. `needsPreflightApproval` and
  `standingAllowanceMicro` are exported (`src/allowancePolicy.ts`).
- Every segment answer is read. `ApiClient.recordSegment` returns the
  backend's `SegmentResponse` (`status`, `end_reason`). `status != "active"`
  stops metering that session and marks it closed locally; `/close` is never
  sent for it. `end_reason: "cap_reached"` (the $2.00 per-session cap) opens
  a new session quietly while the video keeps playing; any other closure
  pauses, opens a new session and resumes. A 409 `session_capped` on a Tier 2
  URL refresh is handled the same way (`SessionCappedError`). `segmentOutcome`,
  `reopenModeFor` and `mustReopenNow` are exported (`src/sessionLifecycle.ts`).
- Ended closes the session. The media's `ended` event closes the session at
  once with the seconds played (POST /close), stops metering and emits
  `session:end` (once; `disconnect()` does not close or emit it again). A
  replay reopens quietly through the same path as any closed session.
- A refusal during the unpaid-tab restart now renders the gate. The
  `tab_unpaid` retry re-ran `attach()` after the play harness's one-shot
  listener had settled, so a refusal could leave the video paused with no
  gate; it now runs through `_reopenSession`, which always shows the
  backend's words and a retry.
- Charged only for played seconds, pinned by tests: no segment while paused,
  nothing after `ended`.
- Stable hosting. `npm run release` runs the tests, builds and copies
  `dist/jubjub-sdk.umd.js` to `stable/` and `v/<version>/`; a GitHub Actions
  check on every push and pull request refuses a tree where they differ. Load
  `https://jubjub-app.github.io/jubjub-sdk/stable/jubjub-sdk.umd.js`.

2.4.1 (card audit fixes, 2026-10-25). Bugs found walking the card flow as a
viewer would, before any real card was used. "Get a card" and "Top up your
card" now show before the viewer-token signature (the cards route is public;
minting a card needs only a wallet); a funded card still signs once before
its session opens, and the approve flow's order is unchanged. A frozen or
closing card is no longer told to top up (a loop: the top-up could never let
it pay); it shows the backend's words. A card session the backend ends
between segments (`card_frozen`, `card_closing`, `card_transferred`,
`card_not_found`) pauses with those words instead of re-opening silently
against the same card; any `card_*` end reason counts as closed even while
the backend's close is still settling. A Tier 2 gate on a card session
retries by opening a new session (reading the cards again), so "Try again"
after a top-up no longer refreshes a session that has ended. Hub sessions
and pieces that do not take cards are unchanged.

2.4.0 (card payments, 2026-10-25). The JubJub card, as Tom decided it: a
funded card just watches, the only prompts are "Top up your card" and "Get a
card" (with "Pay from your wallet instead"), and nothing changes where the
piece does not take cards. See "The JubJub card (2.4.0)" above. New:
`payerMode` and `onSelectCard` (init and per instance); events `card:detected`
`{ cards, mintUrl }`, `card:selected` (the card), `card:low`
`{ tokenId, balanceMicro, requiredMicro, topUpUrl }`, `card:empty`
`{ tokenId, topUpUrl }`; 402 reasons `card_balance_low`, `card_frozen`,
`card_closing`, `card_transferred`, `card_not_found` parse as known reasons
(any other new reason is still `unknown`); `CardNotAcceptedError`;
`ContentInfo.card_contract`, `card_accepted`, `card_min_mint_usdc`,
`card_page_url`, `one_minute_micro`; `sdk.payFromWallet()`. The approve
flow, its floor, the cap and metering are unchanged.

2.3.2 (docs, 2026-10-25). The JubJubPaymentRouter rail is retired on the
backend (Tom, 2026-10-25); the creator pool is the one streaming spender, and
the comments and this document say so. `payment_router` keeps its name and
carries the pool, as it has since the hub cutover. No code path changed:
nothing about pricing, approvals, caps or metering is different.

2.3.1 (fix, 2026-10-25). The declarative play harness (`data-jubjub-*`
videos) never resumes a paid video before the SDK is armed. An `error` before
a session is open used to be read as a benign hiccup and resumed playback with
nothing paid for, so a host that left the source on the element played it
free. It now gates, on the first try and on every retry; `video.play()` runs
only while a session is open (`_isArmed()`). Nothing about pricing,
approvals, caps or metering changed.

2.3.0 (element events, 2026-10-25). The SDK dispatches `jubjub:armed` and
`jubjub:gated` on the `<video>` element, so JubJub's own players (and any
declarative host) can keep a paid Tier 1 piece's URL off the element until
payment is secured. Nothing about pricing, approvals, caps or metering
changed.

- `jubjub:armed`, detail `{ contentId, gated }`: sent synchronously when a
  session is open, before the SDK calls `video.play()`, from `attach()` at the
  moment it emits `ready` (the declarative play harness and `JubJub.play()`
  alike). Once per `attach()`; a re-open (replay, cap rollover, retry) sends
  it again. Never sent without an open session.
- `jubjub:gated`, detail `{ contentId, title, sub }`: sent whenever the SDK
  refuses playback (`payment:required`, the play harness's own timeout, a
  mid-playback gate, a refused re-open). Once per refusal.
- A Tier 1 element with no source until `jubjub:armed` works: nothing before
  `ready` reads the media (no `duration`, no `readyState`, no check on
  `src`). One exception: auto-registration (`data-jubjub-creator`) reads the
  media URL from `src` when `data-jubjub-media-url` is absent, so a host that
  holds the source back there must set `data-jubjub-media-url`.

### The JubJub card (2.4.0)

Where the piece's catalogue takes card payments (playback-info
`card_accepted: true`), a viewer whose wallet holds a funded JubJub card just
watches: no approval, no popup, no message. Where `card_accepted` is false or
absent (an older backend), every `payerMode` runs the approve flow exactly as
before: no cards call, and no `card_token_id` in the session body.

```javascript
JubJub.init({
  platformKey: 'pk_...',
  payerMode: 'auto',               // 'auto' (default) | 'wallet' | 'card'
  onSelectCard: (cards) => cards[0], // optional; several cards each cover a minute
});
```

After the wallet connects (Step 2), and BEFORE the viewer-token signature
(Step 3, since 2.4.1: the cards route is public, so "Get a card" and "Top up
your card" need only a wallet; the signature is asked for once a card will
pay, or when the viewer picks the wallet instead), the SDK reads `GET /v2/public/cards?holder=<wallet>` (header
`X-JubJub-Platform-Key` when `init()` had one, so the mint link carries the
site's referral) and decides:

| The wallet holds | What the viewer sees |
|---|---|
| A usable card (not frozen, no burn pending) whose balance covers one minute at this price (`one_minute_micro`) | Nothing. Step 4 (approval) is skipped and the session opens with `card_token_id`. Several: the highest balance, unless `onSelectCard` returns another of them (or its `token_id`). |
| Cards, none covering one minute | "Top up your card": a link to the card's `top_up_url` + `?return=<page>` (new tab) and "Try again", which reads the cards again. |
| No usable card, and one is frozen or has a burn pending (2.4.1) | The backend's words for it ("Your card is frozen", "Your card is closing") and "Try again", which reads the cards again. No top-up link: a top-up cannot let a frozen card pay. No approval. |
| No card | One "Get a card" prompt: a link to `mint_url` + `&return=<page>` (new tab), "Try again", and "Pay from your wallet instead", which runs the approve flow unchanged for that video from then on. `payerMode: 'card'` never offers the wallet. |

- `payerMode: 'wallet'` never looks for a card.
- 409 `card_not_accepted` at open: the approve flow runs with no prompt
  (`payerMode: 'card'` stops and says the video doesn't take card payments).
- 402 `card_balance_low` (at open or on a Tier 2 URL refresh) is "Top up your
  card". `card_frozen`, `card_closing`, `card_transferred` and
  `card_not_found` stop with the backend's message
  (`FundingRequiredError.isCardRefusal`, `tokenId`, `topUpUrl`).
- Charged only while the video plays (the same segment metering). A segment
  answered `end_reason: "card_empty"` pauses and shows "Top up your card"; its
  retry reads the cards again. A segment answered `end_reason` `card_frozen`, `card_closing`,
  `card_transferred` or `card_not_found` (2.4.1: the backend ended the
  session for the card between segments) stops metering at once; while
  playing it pauses under a gate with the backend's words for the reason (no
  approval, no silent re-open), and the retry, or the next play, reads the
  cards again. A Tier 2 gate on a card session retries by opening a new
  session, never by refreshing the ended one. `cap_reached` rolls over silently with the same
  `card_token_id` (no second cards call).
- The overlay on a card session also shows what the card can still cover
  (`card_balance_micro` from the session open, minus the cost so far) and the
  per-second price.
- A host rendering its own gate reads `err.card` on `payment:required`:
  `{ kind: 'top_up' | 'get_card' | 'unavailable', url, linkText,
  walletFallback, tokenId }`; `sdk.payFromWallet()` is the fallback action.
- No mint or top-up happens in the SDK: both are on the hosted card pages.

### Static shorthand

```javascript
JubJub.play('cnt_abc123', document.getElementById('player'));
```

### BYO wallet

```javascript
const wallet = await JubJub.connectBrowserWallet(); // MetaMask, Coinbase, etc.
JubJub.play('cnt_abc123', video, { wallet });
```

### Events

```javascript
sdk.on('content:loaded', (info) => {});
sdk.on('wallet:connected', (address) => {});
sdk.on('approved', (address) => {});
sdk.on('session:start', (sessionId) => {});
sdk.on('cost', ({ usdc, seconds, formatted }) => {});
sdk.on('session:end', (summary) => {});
sdk.on('error', (error) => {});
sdk.on('ready', () => {});
// 2.4.0, where the piece takes cards:
sdk.on('card:detected', ({ cards, mintUrl }) => {});
sdk.on('card:selected', (card) => {});
sdk.on('card:low', ({ tokenId, balanceMicro, requiredMicro, topUpUrl }) => {});
sdk.on('card:empty', ({ tokenId, topUpUrl }) => {});
```

Element events (2.3.0), dispatched on the `<video>` itself for hosts that
use `data-jubjub-content-id` and never hold the instance:

```javascript
video.addEventListener('jubjub:armed', (e) => {
  // e.detail: { contentId, gated }. Payment is secured; the SDK calls
  // video.play() right after this returns. Attach a held-back Tier 1 URL now.
  if (!video.src) video.src = tier1Url;
});
video.addEventListener('jubjub:gated', (e) => {
  // e.detail: { contentId, title, sub }. Playback refused; the gate's words.
});
```

### Methods

| Method | Returns | Description |
|---|---|---|
| `JubJub.play(contentId, video, options?)` | `JubJub` | Static shorthand. Errors emitted, not thrown. |
| `JubJub.search(params?)` | `Promise<SearchResponse>` | Search JubJub's whole discoverable catalogue with the key from `init()`. Free. Filters: `topic` free-text plus facets (`domain`, `contentType`, `pacing`, `musicPresent`, …); page with `cursor` from the response's `next_cursor` (null = exhausted); `includeUnanalysed: true` also returns registered imports that live on their platform (the card's `platform_video_url`), which have nothing to play here. A card's `content_id` feeds straight into `data-jubjub-content-id` / `JubJub.play()`. |
| `JubJub.setSessionToken(token \| null)` | `void` | Hand over (or forget) a page-level session token; later videos skip the signature step. |
| `JubJub.init({ showCostOverlay })` | `void` | Page-level overlay switch for auto-discovered videos (default true); `JubJubOptions.showCostOverlay` wins per video. Typed since 2.1.6. |
| `JubJub.resetWallet()` | `void` | Forget the page-shared wallet, e.g. before re-`init` with another provider. |
| `JubJub.connectBrowserWallet(network?)` | `Promise<WalletLike>` | Connect MetaMask/Coinbase/injected wallet. Switches to the active network's chain — Base mainnet on `'mainnet'` (default), Base Sepolia on `'testnet'`. |
| `sdk.attach(contentId, video)` | `Promise<void>` | Full setup: wallet, approve, session, tracking. |
| `sdk.disconnect()` | `Promise<SessionSummary>` | Close session, return final cost. |
| `sdk.getCost()` | `CostInfo` | Current `{ usdc, seconds, formatted }`. |
| `sdk.getWallet()` | `string \| null` | Connected wallet address. |
| `sdk.getSession()` | `{ id, onChainId } \| null` | Active session. |

---

## SDK behaviours

Every JubJub-tagged video is FAIL CLOSED: it stays paused under a gate until
payment is in place, and the gate says what to do. Videos without JubJub
attributes are never touched.

| Scenario | Behaviour |
|---|---|
| No content ID and no creator attribute | SDK ignores the video. It plays as the page set it. |
| Invalid content ID (404) or playback-info unavailable | Gate: "Unable to load payment details". Video stays paused. |
| Video pauses | Payments pause. Nothing accrues and no segment is sent, however long the pause; resuming continues the same session. |
| Video ends | The session closes at once with the seconds played; charging stops; `session:end` emitted. Play again and a new session opens quietly from the pot. |
| Session reaches its $2.00 cap (segment answers `closed`, `end_reason: cap_reached`) | The SDK stops metering it, never sends `/close` for it, and quietly opens a new session from the same pot while the video keeps playing. If the open answers 402, the video pauses under the gate with the backend's figures. |
| 409 `session_capped` on a gated-URL refresh | Same as the cap above (Tier 2). Not a gate. |
| Backend closes the session for another reason (segment answers `closed`) | Metering stops; `/close` is never sent for it. While playing: pause, open a new session, resume. Paused: the next play opens a new one. |
| Seek backwards | Cost stays. Accumulative, never decreases. |
| Seek forward | No charge for skipped content. Seeks are detected from the element's `seeking` and `seeked` events. |
| Tab backgrounded (`timeupdate` throttled) | Time actually played is charged, bounded by the wall clock. |
| Tab close | Beacon closes the session with the exact seconds watched; settlement follows on-chain. |
| Tab hidden | Beacon closes the session only while the video is paused or ended. Background audio keeps it open; the idle sweep closes an abandoned one. |
| Play after the session was closed (ended, cap, beacon, idle) | SDK pauses, opens a new session from the pot, resumes from the same position once it is open. No prompt unless the open answers 402; a refusal is shown in the gate with the backend's words and a retry. |
| Pre-flight allowance at or above $0.50 | No approval asked. The backend decides whether the session opens. |
| Pre-flight allowance below $0.50 | The wallet asks for the standing allowance ($10 by default). |
| 402 from the backend (allowance, balance, unpaid tab) | Gate with the backend's figure; the approve button asks for exactly that. `funding:required` emitted. |
| 402 with a reason this bundle does not know | Gate with the backend's message (`FundingRequiredError`, reason `'unknown'`). No approval is guessed; the page token is kept. |
| No wallet | Gate: "Connect a wallet to watch". Video stays paused. `payment:required` emitted. |
| Wallet connection or signature declined | Gate naming the refusal ("You cancelled the request"). Video stays paused. |
| Payment service error | Gate: "Payment service unavailable". Video stays paused. |

`payment:required` carries the gate's title, sub and button text, so a host
rendering its own gate shows the same words.

---

## Authentication

Three auth paths, depending on caller:

| Caller | Method | Token format |
|---|---|---|
| Platform backend | `X-JubJub-Platform-Key` header | `pk_` prefix, SHA-256 hashed in storage |
| SDK viewer | `Authorization: Bearer jj_...` | HMAC-SHA256 JWT, 24h TTL |
| Dashboard creator | `Authorization: Bearer <firebase>` | Firebase ID token or session cookie |

The auth chain in `verify_token_cookie` checks in order: platform key -> agent key -> service key -> `jj_` session token -> `jjat_` OAuth -> Firebase session cookie -> Firebase ID token.

---

## What JubJub does NOT do

- Host or transcode video
- Compete with YouTube or TikTok
- Custody funds (smart contracts are non-custodial)
- Require creators to change their workflow
- Play a JubJub-tagged video for free when payment is not in place (fail closed since 2.0)
- Charge viewers without explicit wallet connection
- Require crypto knowledge from developers or creators

---

## Bundle

| | Size |
|---|---|
| UMD (uncompressed) | 338 KB (2.2.0, `dist/jubjub-sdk.umd.js`) |
| UMD (gzipped) | 104 KB |
| Dependency | viem (bundled) |
| Browser support | ES2020+ |
| Peer dependency (optional) | @privy-io/js-sdk-core (declared; not imported by the bundle) |

`dist/` is built by hand (`npm run build`) and committed. GitHub Pages serves
the root of `main`, so three addresses exist:

| Address | What it is |
|---|---|
| `https://jubjub-app.github.io/jubjub-sdk/stable/jubjub-sdk.umd.js` | The release to load. Moves only after `npm run release` has passed the full test suite. |
| `https://jubjub-app.github.io/jubjub-sdk/v/2.4.1/jubjub-sdk.umd.js` | That release, pinned. One folder per version. |
| `https://jubjub-app.github.io/jubjub-sdk/dist/jubjub-sdk.umd.js` | Legacy: main's build output, unpinned. Kept working. |

`npm run release` runs the tests, builds, and copies `dist/jubjub-sdk.umd.js`
to `v/<version>/` and `stable/`; the copies are committed with `dist/`.
`npm run check:release` (also the Release check workflow on every push to
main and every pull request) fails unless both copies exist and are
byte-identical to `dist/` for the version in package.json. `.nojekyll` at the
root keeps Pages from processing the bundle. `JubJub.version` reports the
package.json version the bundle was built from.

---

## Current status (October 2026)

The backend is live on Base mainnet. The SDK defaults to `network:
'mainnet'` (Base, chain `8453`) and runs against Base Sepolia when
initialised with `network: 'testnet'`.

**Working (testnet and mainnet):**
- Platform content registration with ownership token deployment
- Streaming payment sessions with per-second settlement
- Brand token auto-minting on first publish
- Revenue auto-forward from content contracts to catalogues
- SDK Player with cost overlay and accumulative tracking
- Beacon-close on tab close for precise settlement
- Stable and versioned bundle addresses (`stable/`, `v/<version>/`) checked in CI
- The pot model: approve once, charged only while playing, ended closes, replay and the $2.00 cap reopen quietly
- Three auth paths (platform key, viewer JWT, Firebase)
- Content hash dedup for provenance

**Pending:**
- Privy zero-config wallet (no browser extension needed)
- npm publish (`@jubjub/sdk`)
- A marketplace for brand token units. None exists today: units are transferable on chain, JubJub offers no trading, and JubJub's records do not follow a transfer
- Dynamic pricing per content

---

## Repository

SDK: [github.com/JubJub-app/jubjub-sdk](https://github.com/JubJub-app/jubjub-sdk)

Backend: Private. API at `https://api.jubjubapp.com`.

Dashboard: [studio.jubjubapp.com](https://studio.jubjubapp.com)
