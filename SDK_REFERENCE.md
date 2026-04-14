# JubJub SDK Reference

**Version:** 0.1.0
**Chain:** Base (Coinbase L2) — Sepolia testnet
**Status:** Functional on testnet. Mainnet pending security audit.

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
<script src="https://cdn.jubjub.app/sdk.js"></script>
<script>
  JubJub.play('cnt_abc123', document.getElementById('player'));
</script>
```

That's it.

---

## What happens when a viewer presses play

1. SDK fetches payment config from JubJub API (public endpoint, no auth)
2. Wallet connect prompt appears (MetaMask, Coinbase Wallet, Rainbow)
3. USDC spending approved (one-time per wallet)
4. Streaming session opens on Base
5. Cost overlay appears on the video: `$0.0042 · 0:42 · Powered by JubJub`
6. Heartbeat fires every 6 seconds of playback
7. Video pauses — payments pause. Seek backwards — cost stays (accumulative). Seek forward — no charge for skipped content.
8. Tab closes — settlement fires on-chain with exact playback seconds
9. USDC flows: viewer -> router -> content contract -> catalogue -> creator

---

## Revenue flow

**Example: viewer pays $1.00**

| Recipient | Amount | Mechanism |
|---|---|---|
| JubJub | $0.03 (3%) | Extracted at router level |
| Content contract | $0.97 | On-chain transfer |
| Catalogue | $0.97 | Auto-forwarded from content contract |
| Tom (70% brand token) | $0.679 | Proportional to brand token holdings |
| Danielle (30% brand token) | $0.291 | Proportional to brand token holdings |

Revenue streams across JubJub:

| Stream | Creator share | JubJub share |
|---|---|---|
| Streaming payments | 97% | 3% |
| Secondary market | 96% seller / 2.5% creator royalty | 1.5% |
| Metadata search | 0% | 100% |
| Data feeds | 10% | 90% |

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
  "payment_router": "0xf5207b827f90b15da403c45A339BDC4a87BC258E",
  "usdc_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "chain_id": 84532,
  "chain_name": "base-sepolia"
}
```

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
Brand Token (10,000 supply per catalogue)
  Tradeable. Represents proportional ownership of ALL content revenue.
  Example: Tom 7,000 / Danielle 3,000
     |
     v
Catalogue Contract (one per team or solo creator)
  Holds all content tokens. Receives revenue via auto-forward.
  Distributes to brand token holders proportionally.
     |
     v
Content Token (10,000 supply per video)
  Created per video. All held by catalogue.
  Receives streaming revenue from PaymentRouter.
  Auto-forwards to catalogue in the same transaction.
```

### Payment flow on-chain

```
Viewer USDC
  -> PaymentRouter.settle()
    -> 3% to JubJub treasury
    -> 97% to Content Contract via notifyDistribution()
      -> auto-forward to Catalogue (same tx)
        -> accumulator updates
          -> brand token holders withdraw proportionally
```

### Smart contracts (Base Sepolia testnet)

| Contract | Address |
|---|---|
| JubJubPaymentRouter | `0xf5207b827f90b15da403c45A339BDC4a87BC258E` |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| MediaOwnershipFactoryV2 | `0xFEDbA948C55Ff7D68228F05F080E70AfEa48aEEF` |
| JubJubCatalogueFactory | `0x33Fb47f1d1DaDB3c0098F7A9D66c189701DAa95F` |
| JubJubPublishLedger | `0x39c3dB9070FDbb9ED9e144782260b4802503b444` |

---

## SDK configuration

```javascript
const sdk = new JubJub({
  wallet: myWalletClient,          // BYO viem WalletClient, or null for prompt
  apiUrl: 'https://api.jubjubapp.com',
  network: 'testnet',             // 'testnet' or 'mainnet'
  showCostOverlay: true,           // default true
  overlayPosition: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  onCostUpdate: (cost, seconds) => {},
  onSessionStart: (sessionId) => {},
  onSessionEnd: (summary) => {},
  onError: (error) => {},
  onWalletConnected: (address) => {},
});

await sdk.attach('cnt_abc123', videoElement);
```

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
```

### Methods

| Method | Returns | Description |
|---|---|---|
| `JubJub.play(contentId, video, options?)` | `JubJub` | Static shorthand. Errors emitted, not thrown. |
| `JubJub.connectBrowserWallet()` | `Promise<WalletLike>` | Connect MetaMask/Coinbase/injected wallet. Switches to Base Sepolia. |
| `sdk.attach(contentId, video)` | `Promise<void>` | Full setup: wallet, approve, session, tracking. |
| `sdk.disconnect()` | `Promise<SessionSummary>` | Close session, return final cost. |
| `sdk.getCost()` | `CostInfo` | Current `{ usdc, seconds, formatted }`. |
| `sdk.getWallet()` | `string \| null` | Connected wallet address. |
| `sdk.getSession()` | `{ id, onChainId } \| null` | Active session. |

---

## SDK behaviours

| Scenario | Behaviour |
|---|---|
| No content ID | Fails silently. Video plays free. SDK invisible. |
| Invalid content ID (404) | Fails silently. Video plays free. |
| Video pauses | Payments pause. |
| Seek backwards | Cost stays. Accumulative, never decreases. |
| Seek forward | No charge for skipped content. |
| Tab close | Beacon fires settlement with exact seconds watched. |
| Payment fails | Video still plays. Error emitted via callback. |
| No wallet extension | Error emitted. Video still plays. |
| Wallet connection declined | Error emitted. Video still plays. |

JubJub never blocks video playback.

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
- Block playback if payments fail
- Charge viewers without explicit wallet connection
- Require crypto knowledge from developers or creators

---

## Bundle

| | Size |
|---|---|
| UMD (uncompressed) | 288 KB |
| UMD (gzipped) | 89 KB |
| Dependency | viem (bundled) |
| Browser support | ES2020+ |
| Peer dependency (optional) | @privy-io/js-sdk-core |

---

## Current status (April 2026)

**Working on Base Sepolia testnet:**
- Platform content registration with ownership token deployment
- Streaming payment sessions with per-second settlement
- Brand token auto-minting on first publish
- Revenue auto-forward from content contracts to catalogues
- SDK Player with cost overlay and accumulative tracking
- Beacon-close on tab close for precise settlement
- Three auth paths (platform key, viewer JWT, Firebase)
- Content hash dedup for provenance

**Pending:**
- Mainnet deployment (pending security audit)
- Privy zero-config wallet (no browser extension needed)
- CDN hosting for SDK bundle (`cdn.jubjub.app/sdk.js`)
- npm publish (`@jubjub/sdk`)
- Secondary market for brand tokens
- Dynamic pricing per content

---

## Repository

SDK: [github.com/JubJub-app/jubjub-sdk](https://github.com/JubJub-app/jubjub-sdk)

Backend: Private. API at `https://api.jubjubapp.com`.

Dashboard: [studio.jubjubapp.com](https://studio.jubjubapp.com)
