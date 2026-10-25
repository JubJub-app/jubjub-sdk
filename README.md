# JubJub SDK

Add pay-per-view streaming payments to any video on your website.

## Quick Start

```html
<script src="https://jubjub-app.github.io/jubjub-sdk/stable/jubjub-sdk.umd.js"></script>
```

That is the stable address: it moves only after a release has passed the full
test suite. To pin a version instead:

```html
<script src="https://jubjub-app.github.io/jubjub-sdk/v/2.4.0/jubjub-sdk.umd.js"></script>
```

(The older `.../jubjub-sdk/dist/jubjub-sdk.umd.js` address is legacy: it is
main's build output with no version pin. It keeps working, but new
integrations should load `stable/` or `v/<version>/`.)

1. Get your API key at [jubjubapp.com/developers](https://jubjubapp.com/developers)
2. Add to your site template:

```html
<script src="https://jubjub-app.github.io/jubjub-sdk/stable/jubjub-sdk.umd.js" crossorigin="anonymous"></script><script>JubJub.init({ platformKey: 'pk_...' });</script>

<!-- Optional: surface JubJub's whole catalogue on your site -->
<script>
  JubJub.search({ topic: 'surfing' }).then(({ results }) => {
    // each card: { content_id, title, thumbnail_url, topics, ... }
    // play one: <video data-jubjub-content-id="..."> or JubJub.play(id, video)
  });
</script>
```

3. Add data attributes to your video elements:

```html
<video
  src="https://your-cdn.com/video.mp4"
  data-jubjub-creator="creator@email.com"
  data-jubjub-title="Video Title"
  controls>
</video>
```

That's it. Videos with JubJub attributes get pay-per-view. Videos without them play free.

When a viewer with a wallet presses play:
1. Content auto-registers (ownership token deploys on Base)
2. Wallet connects and signs once per page (free, no gas)
3. USDC allowance checked. The viewer approves a standing allowance (their
   pot, $10 by default) to JubJub's streaming spender only when the current
   allowance is below $0.50, the backend's floor; see The pot below
4. Streaming payments accrue at the content's per-minute price, for the
   seconds actually played
5. Creator earns on-chain when the session settles

## The pot: approve once

The viewer approves an amount once. That approval is their pot, and every
JubJub video on every site draws from it:

- They are asked to approve only when the pot is below $0.50. With $0.50 or
  more approved they are never asked again, on any site, until the pot runs
  below that.
- They are charged only for seconds actually played. Paused, hidden and
  paused, ended, or nothing playing means no charge.
- When a video ends, its session closes at once and charging stops.
- If they play again (a rewatch, or another video), a session reopens quietly
  in the background and draws from the same pot. No prompt, no wallet popup.
- A single session is capped at $2.00. When a session reaches the cap the SDK
  closes it and quietly opens a new one from the same pot, and playback
  continues without a pause.
- The only payment prompt a viewer ever sees is when the pot cannot cover
  continued viewing. Then the video pauses under a gate that shows the
  backend's figures, and the approve button asks for exactly what is needed.

Playback is fail closed. A viewer without a wallet, who declines a prompt, or
whose USDC cannot fund a session sees a gate over the paused video saying what
to do; the video does not play until payment is in place. Videos without JubJub
attributes are never touched.

**JubJub handles the money stream, not the video stream.** Your video serves from your own CDN.

## The JubJub card (2.4.0)

Where a piece's catalogue takes the JubJub card (playback-info
`card_accepted: true`), a viewer whose wallet holds a funded card just
watches: no approval and no popup. They are charged only while the video
plays, and the per-session cap rolls over silently. The only prompt they see
is "Top up your card" when the card can't cover a minute. A viewer with no
card sees one "Get a card" prompt (the hosted card page, in a new tab) with
"Pay from your wallet instead", which is the pot flow above, unchanged.

`JubJub.init({ payerMode })`: `'auto'` (default), `'wallet'` (never look for
a card) or `'card'` (never offer the wallet). Where the piece doesn't take
cards, every mode is the pot flow. Details: `SDK_REFERENCE.md`.

## Data Attributes

| Attribute | Required | Description |
|---|---|---|
| `data-jubjub-content-id` | Either this... | Pre-registered content ID (skips registration) |
| `data-jubjub-creator` | ...or this | Creator email or wallet (triggers auto-registration) |
| `data-jubjub-title` | No | Video title (defaults to page title) |
| `data-jubjub-media-url` | No | Media URL for hashing (defaults to video src) |
| `data-jubjub-price` | No | Price per minute override (USDC; the backend bounds it) |
| `data-jubjub-disabled` | No | If present, SDK ignores this video |

## Advanced: Manual Control

```js
// With an existing content_id:
JubJub.play('cnt_abc123', document.getElementById('player'));

// With inline registration:
JubJub.play({
  creator: 'creator@email.com',
  title: 'My Video',
  mediaUrl: 'https://cdn.com/video.mp4',
}, document.getElementById('player'));

// With a BYO wallet:
const wallet = await JubJub.connectBrowserWallet();
JubJub.play('cnt_abc123', video, { wallet });
```

## Server-side registration (optional)

For tighter control, register from your backend:

```js
// Server-side: register content
const res = await fetch('https://api.jubjubapp.com/v2/platform/register-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-JubJub-Platform-Key': 'pk_your_key',
  },
  body: JSON.stringify({
    creator_email: 'creator@example.com',
    title: 'My Video',
    media_url: 'https://your-cdn.com/video.mp4',
  }),
});
const { content_id } = await res.json();

// Client-side: embed the player
JubJub.play(content_id, videoElement);
```

## How It Works

```
Viewer watches    Wallet connects    USDC accrues      Creator earns
   video     -->   (one-time)   -->  per segment  -->  automatically
   [CDN]         [MetaMask/etc]        [Base]        [Brand tokens]
```

JubJub mints an ownership token for every piece of content. Revenue flows through smart contracts on Base and distributes automatically to token holders.

## Configuration

```js
const sdk = new JubJub({
  apiUrl: 'https://api.jubjubapp.com',    // API endpoint
  network: 'mainnet',                      // 'mainnet' (Base, default) or 'testnet' (Base Sepolia)
  showCostOverlay: true,                   // Show cost/time overlay
  overlayPosition: 'bottom-right',         // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  wallet: myWalletClient,                  // Optional: bring your own viem WalletClient
  onCostUpdate: (cost, seconds) => {},     // Called every 200ms
  onSessionStart: (sessionId) => {},
  onSessionEnd: (summary) => {},
  onError: (error) => {},
  onWalletConnected: (address) => {},
  payerMode: 'auto',                       // 2.4.0: 'auto' | 'wallet' | 'card'
});

await sdk.attach('content-id', videoElement);
```

## BYO Wallet

If your app already has a wallet connection, pass it directly:

```js
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains'; // Base mainnet; use baseSepolia with network: 'testnet'

const walletClient = createWalletClient({
  account: userAddress,
  chain: base,
  transport: custom(window.ethereum),
});

JubJub.play('content-id', video, { wallet: walletClient });
```

## Events

```js
const sdk = JubJub.play('content-id', video);

sdk.on('content:loaded', (info) => { /* content metadata */ });
sdk.on('wallet:connected', (address) => { /* wallet address */ });
sdk.on('approved', (address) => { /* USDC approved */ });
sdk.on('session:start', (sessionId) => { /* streaming started */ });
sdk.on('cost', (costInfo) => { /* { usdc, seconds, formatted } */ });
sdk.on('session:end', (summary) => { /* final summary */ });
sdk.on('error', (error) => { /* handle error */ });
sdk.on('ready', () => { /* everything set up */ });
sdk.on('card:selected', (card) => { /* 2.4.0: paying with this card */ });
sdk.on('card:low', (e) => { /* 2.4.0: "Top up your card" shown */ });
```

### Element events: armed and gated (2.3.0)

The SDK also dispatches two DOM events on the `<video>` element itself, so a
page using `data-jubjub-content-id` (which never holds the SDK instance) can
tell when payment is secured.

| Event | When | `event.detail` |
|---|---|---|
| `jubjub:armed` | A streaming session is open and the SDK is about to start playback. Sent synchronously, before the SDK calls `video.play()`, at the same moment the instance emits `ready`. Once per arming; again after a replay, a cap rollover or a retry after a gate. | `{ contentId, gated }` (`gated` is the piece's Tier 2 flag) |
| `jubjub:gated` | Playback was refused because payment is not secured: the same moment the SDK emits `payment:required` or shows its retry gate. | `{ contentId, title, sub }` (the gate's words; `contentId` is null only when auto-registration failed) |

For a paid Tier 1 piece (a public URL), keep the URL off the element and set
it on `jubjub:armed`. If the SDK never loads or never arms, nothing plays:

```html
<video id="player" data-jubjub-content-id="cnt_abc123" controls></video>
<script>
  const video = document.getElementById('player');
  video.addEventListener('jubjub:armed', () => {
    if (!video.src) video.src = 'https://creator.example/video.m3u8';
  });
  video.addEventListener('jubjub:gated', (e) => console.log(e.detail.title));
</script>
```

Set the source only when the element has none: a later `jubjub:armed` (a
replay or a rollover) must not reset the position. Tier 2 pieces need nothing:
the SDK sets the signed URL itself before `jubjub:armed`. The names are
exported as `JUBJUB_ARMED_EVENT` and `JUBJUB_GATED_EVENT`, and on the script
tag global as `JubJub.ARMED_EVENT` and `JubJub.GATED_EVENT`.

## API Reference

### `JubJub.play(contentId, video, options?)`
Static shorthand. Returns a `JubJub` instance. Errors are emitted, not thrown.

### `new JubJub(options?)`
Create an instance without auto-starting.

### `sdk.attach(contentId, video)`
Async. Connects wallet, approves USDC, creates session, starts tracking.

### `sdk.disconnect()`
Async. Closes session, returns `SessionSummary`.

### `sdk.getCost()`
Returns current `{ usdc, seconds, formatted }`.

### `sdk.getWallet()`
Returns connected wallet address or null.

### `sdk.getSession()`
Returns `{ id, onChainId }` or null.

## Chain Info

The SDK runs on Base. `network: 'mainnet'` (the default, `src/JubJub.ts`)
uses Base mainnet (chain `8453`); `network: 'testnet'` uses Base Sepolia
(chain `84532`). The flag switches the wallet chain, RPC and block
explorer together. An integration that omits `network` is on mainnet and
moves real USDC; pass `'testnet'` explicitly to develop against Sepolia.

Contract addresses are **not** baked into the SDK. The backend's
playback-info response carries them per content, so they are always right
for the chain the content lives on:

| Field | What it is |
|---|---|
| `usdc_address` | The USDC token the viewer approves and is charged in |
| `payment_router` | The streaming spender: the address the viewer's USDC allowance is granted to. This is the address the backend draws against for streaming (the JubJubCreatorPool; the field name is historical), and the same address a 402 names as `spender` |
| `chain_id` | `8453` on mainnet, `84532` on Base Sepolia |

## Allowance

The viewer grants the streaming spender a standing USDC allowance (default
$10, `streamingAllowanceUsd` on `init()`, never unlimited, capped at $500,
never below $0.50) and streams against it signature-free. Before opening a
session the SDK reads the allowance and asks for a new approval only when it
is below $0.50 (`PREFLIGHT_FLOOR_MICRO`, the same figure as the backend's
`FUNDING_FLOOR_MICRO`). It never approves on a guess above that. The backend
requires at least $0.50 of allowance and balance, plus any unpaid tab, before
it opens a session, and answers 402 otherwise; the SDK then shows the
backend's requirement and the approve button asks for exactly that figure.
Before 2.2.0 the SDK's own threshold was the larger of $2 and a 120-minute
session, so a viewer who had approved $1 elsewhere was asked again here.

## Sessions, tabs and seeks

- A streaming session is open while paid playback is happening. When the
  video ends the SDK closes the session at once with the seconds played.
  Closing the tab (`beforeunload`, `pagehide`) sends a beacon that closes it
  with the seconds watched. Hiding the tab closes it only when the video is
  paused or has ended; background audio keeps the session open, and the
  backend's idle sweep closes a session that is truly abandoned.
- Every segment's answer is read. When the backend closes a session (the
  $2.00 per-session cap, an unpaid tab, the idle sweep) the SDK stops
  metering it and never sends `/close` for it. On the cap it opens a new
  session while the video keeps playing; on any other closure it pauses,
  opens a new session and resumes. A session capped on a gated-URL refresh
  (409 `session_capped`) is handled the same way.
- Playback never continues against a closed session. When play resumes after
  the session was closed (ended, cap, beacon, idle), the SDK opens a new
  session and resumes from the same position once it is open, without a
  prompt; a 402 is shown in the gate with the backend's words and a retry.
- Billing follows time actually played. Nothing accrues while paused or after
  the end. Seeks (the element's `seeking` and `seeked` events) are never
  charged, forward or back; a backgrounded tab whose `timeupdate` events
  arrive seconds apart is charged for the time that passed.

## License

MIT
