# JubJub SDK: core rules

`@jubjub/sdk`: the pay-per-view player. One script tag plus `JubJub.init`
adds per-second USDC streaming payments to any video; the video stays on the
integrator's CDN and JubJub handles only the money. TypeScript, built by vite
into a UMD bundle. It is one of JubJub's six surfaces: movie_system_jubjub
`docs/briefs/repos-and-surfaces.md`.

## Rules
- Platform mechanics are Tom's decision: what a viewer is charged, when,
  the approval and pot model, fees and splits. A change to how payment
  behaves is proposed to Tom first and not built until he approves it.
- Charge only for played seconds: no segment while paused, nothing after
  `ended`. Tests pin this; keep them passing.
- The SDK is a player, not a publishing destination (the backend's on-chain rule).
- Copy rules (no em dashes, sentence case, straight quotes) apply to every
  string a viewer sees: movie_system_jubjub CLAUDE.md "Code rules".
- The backend routes the SDK calls live in movie_system_jubjub
  (`backend/src/v2/presentation/routes/sdk_routes.py`, `streaming_routes.py`).
  A change on either side needs both checked.

## Build, test, release
```bash
npm ci
npm test              # tsc to .test-build, then node --test
npm run build         # vite bundle plus .d.ts into dist/
npm run release       # tests, build, copy dist/jubjub-sdk.umd.js to stable/ and v/<version>/
npm run check:release # what CI runs: stable/ and v/<version>/ must match dist/
```
- GitHub Pages serves the root of main. Stable address:
  `https://jubjub-app.github.io/jubjub-sdk/stable/jubjub-sdk.umd.js`; pinned:
  `.../v/<version>/jubjub-sdk.umd.js`. The old `.../dist/jubjub-sdk.umd.js`
  is legacy but still served (the website's developers page and watch page
  load it).
- `dist/`, `stable/` and `v/` are committed by hand after `npm run release`;
  bump `package.json` version and the version line in `SDK_REFERENCE.md`.
- Copies elsewhere do not update themselves: `farcaster_miniapp` vendors
  `jubjub-sdk.umd.js` and `bankr-tv` serves `/vendor/jubjub-sdk.umd.js`.

## Read when relevant
- `SDK_REFERENCE.md`: the public API, events, version history.
- `README.md`: integration guide for developers.
- `TODO-SDK.md`: open work. `AUDIT-SDK.md` is a point-in-time audit; read it
  only when asked.
