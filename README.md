# JubJub SDK

Add pay-per-view streaming payments to any video on your website.

## Quick Start

1. Get your API key at [jubjubapp.com/developers](https://jubjubapp.com/developers)
2. Add to your site template:

```html
<script src="https://jubjub-app.github.io/jubjub-sdk/dist/jubjub-sdk.umd.js"></script>
<script>JubJub.init({ platformKey: 'pk_YOUR_KEY' });</script>
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

When a viewer with MetaMask presses play:
1. Content auto-registers (ownership token deploys on Base)
2. Wallet connects (one-time per page)
3. USDC approved (one-time per wallet)
4. Streaming payments flow at $0.005/min
5. Creator earns in real-time on-chain

Viewers without a wallet extension see no prompts — videos play free.

**JubJub handles the money stream, not the video stream.** Your video serves from your own CDN.

## Data Attributes

| Attribute | Required | Description |
|---|---|---|
| `data-jubjub-content-id` | Either this... | Pre-registered content ID (skips registration) |
| `data-jubjub-creator` | ...or this | Creator email or wallet (triggers auto-registration) |
| `data-jubjub-title` | No | Video title (defaults to page title) |
| `data-jubjub-media-url` | No | Media URL for hashing (defaults to video src) |
| `data-jubjub-price` | No | Price per minute override (default $0.005) |
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
Viewer watches    Wallet connects    USDC streams      Creator earns
   video     -->   (one-time)   -->  per second   -->  automatically
   [CDN]         [MetaMask/etc]    [Base Sepolia]    [Brand tokens]
```

JubJub mints an ownership token for every piece of content. Revenue flows through smart contracts on Base and distributes automatically to token holders.

## Configuration

```js
const sdk = new JubJub({
  apiUrl: 'https://api.jubjubapp.com',    // API endpoint
  network: 'testnet',                      // 'testnet' or 'mainnet'
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

## Chain Info (Base Sepolia Testnet)

| Contract | Address |
|---|---|
| Payment Router | `0xf5207b827f90b15da403c45A339BDC4a87BC258E` |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Chain ID | `84532` |

## License

MIT
