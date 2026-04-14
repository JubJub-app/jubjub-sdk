# JubJub SDK

Add pay-per-view streaming payments to any video. Two lines of code.

## Quick Start

```html
<video id="player" src="https://your-cdn.com/video.mp4"></video>
<script src="https://cdn.jubjub.app/sdk.js"></script>
<script>
  JubJub.play('your-content-id', document.getElementById('player'));
</script>
```

That's it. When the viewer presses play:
1. Wallet connects (MetaMask, Coinbase, or embedded)
2. USDC approval (one-time, silent)
3. Streaming payments flow at $0.005/min
4. Creator earns in real-time on Base

**JubJub handles the money stream, not the video stream.** Your video serves from your own CDN.

## For Platforms

Register content from your backend, then embed the player:

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
