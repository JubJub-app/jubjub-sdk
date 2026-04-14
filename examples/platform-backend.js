/**
 * JubJub Platform SDK — Backend Registration Example
 *
 * This script shows how a platform partner registers content via the
 * JubJub API. Run with: node examples/platform-backend.js
 *
 * Prerequisites:
 *   1. Get a platform API key from studio.jubjubapp.com → Settings → API Keys
 *      (or POST /v2/platform/keys with your Firebase auth token)
 *   2. Replace PLATFORM_KEY below with your key
 */

const PLATFORM_KEY = 'pk_YOUR_KEY_HERE';
const API_URL = 'https://api.jubjubapp.com';

async function registerContent() {
  const response = await fetch(`${API_URL}/v2/platform/register-content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-JubJub-Platform-Key': PLATFORM_KEY,
    },
    body: JSON.stringify({
      // Creator identity — at least one required
      creator_email: 'creator@example.com',
      // creator_wallet: '0x...', // optional

      // Content metadata
      title: 'My First Video',
      description: 'A demo video registered via the JubJub SDK',
      media_url: 'https://your-cdn.com/video.mp4',

      // Optional: per-minute price (default $0.005)
      price_per_minute: 0.005,

      // Optional: platform attribution
      platform_name: 'your-platform',
      platform_video_id: 'vid_123',
      platform_video_url: 'https://your-platform.com/watch/vid_123',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Registration failed:', response.status, error);
    return;
  }

  const result = await response.json();
  console.log('Content registered:');
  console.log(JSON.stringify(result, null, 2));

  // Response:
  // {
  //   "content_id": "cnt_xxx",        ← Use this with JubJub.play()
  //   "profile_id": "xxx",            ← Creator's JubJub profile
  //   "workspace_id": "ws_xxx",
  //   "media_id": "med_xxx",
  //   "ownership_status": "minting",  ← Token deploying on Base
  //   "catalogue_address": "0x...",    ← Creator's catalogue (if exists)
  //   "creator_is_new": true,          ← Whether a new profile was created
  //   "content_hash": "sha256...",    ← Provenance hash
  //   "message": "Content registered. Ownership tokens deploying."
  // }

  console.log(`\nEmbed in your page:`);
  console.log(`<script src="https://cdn.jubjub.app/sdk.js"></script>`);
  console.log(`<script>JubJub.play('${result.content_id}', videoElement);</script>`);
}

registerContent().catch(console.error);
