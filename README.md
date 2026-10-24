# JubJub SDK

Add pay-per-view streaming payments to any video on your website.

## Quick Start

1. Get your API key at [jubjubapp.com/developers](https://jubjubapp.com/developers)
2. Add to your site template:

```html
<script src="https://jubjub-app.github.io/jubjub-sdk/dist/jubjub-sdk.umd.js"></script>
<script>JubJub.init({ platformKey: 'pk_YOUR_KEY' });</script>

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
3. USDC allowance checked. The viewer approves a standing allowance to
   JubJub's streaming spender when the current allowance is below the SDK's
   threshold (see Allowance below); not on every play, and not once for ever
4. Streaming payments accrue at the content's per-minute price
5. Creator earns on-chain when the session settles

Playback is fail closed. A viewer without a wallet, who declines a prompt, or
whose USDC cannot fund a session sees a gate over the paused video saying what
to do; the video does not play until payment is in place. Videos without JubJub
attributes are never touched.

**JubJub handles the money stream, not the video stream.** Your video serves from your own CDN.

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
});

await sdk.attach('content-id', videoElement);
```

## BYO Wallet

If your app already has a wallet connection, pass it directly:

```js
import { createWalletClient, custom } from 'viem';
import { baseSepolia } from 'viem/chains';

const walletClient = createWalletClient({
  account: userAddress,
  chain: baseSepolia,
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
```

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
| `payment_router` | The streaming spender: the address the viewer's USDC allowance is granted to. This is the address the backend draws against for streaming (the creator pool on the current rail), and the same address a 402 names as `spender` |
| `chain_id` | `8453` on mainnet, `84532` on Base Sepolia |

## Allowance

The viewer grants the streaming spender a standing USDC allowance (default
$10, `streamingAllowanceUsd` on `init()`, never unlimited, capped at $500) and
streams against it signature-free. The SDK asks for a new approval only when
the remaining allowance is below its own threshold (the larger of $2 and the
price of a 120-minute session). The backend separately requires at least $0.50
of allowance and balance, plus any unpaid tab, before it opens a session, and
answers 402 otherwise; the SDK then shows the backend's requirement and the
approve button asks for exactly that.

## Sessions, tabs and seeks

- A streaming session is open while paid playback is happening. Closing the
  tab (`beforeunload`, `pagehide`) sends a beacon that closes it with the
  seconds watched. Hiding the tab closes it only when the video is paused or
  has ended; background audio keeps the session open, and the backend's idle
  sweep closes a session that is truly abandoned.
- Playback never continues against a closed session. When play resumes after
  the session was closed, the SDK pauses, opens a new session and resumes
  from the same position only once it is open; a refusal is shown in the gate.
- Billing follows time actually played. Seeks (the element's `seeking` and
  `seeked` events) are never charged, forward or back; a backgrounded tab whose
  `timeupdate` events arrive seconds apart is charged for the time that passed.

## License

MIT
