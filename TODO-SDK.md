# JubJub SDK — Outstanding Work

## DONE (this session, for reference)
- Allowance/RPC bug fixed (RPC + chain now sourced from backend chain_id; bytecode preflight).
- Default network flipped to mainnet (bare snippet works out the box).
- Bounded USDC approval + NaN guard (no more unlimited-approval; bounded ~$2 session cap).
- Fail-closed on ALL JubJub-content payment failures (A/B/C/D/F gate; G untouched).
- PaymentRouter verified on Basescan (Blockaid scam-flag lever pulled; presumed resolved).
- Proven on-chain: SDK settles real USDC on Base mainnet from an external origin, 97/3 split.

## RELEASE MECHANICS (do before calling v1 shippable)
- Version bump 1.0.0 -> 1.0.1 (or 1.1.0 — breaking default change). package.json + tag.
- Changelog noting breaking changes: default network now mainnet (testnet users must pass network:'testnet'); approval is now bounded (previously-unlimited wallets re-approve once); fail-closed gating (direct JubJub.play() embedders must listen for 'payment:required' to gate their own <video>).
- Commit the untracked dist/*.d.ts type declarations (currently untracked per earlier audit).
- Decide: npm publish (@jubjub/sdk currently 404/unpublished) vs UMD-only via GitHub Pages.
- Confirm GitHub Pages serves from the correct branch/folder, and document the build+publish step.

## BUILD INFRA (stop fighting local pnpm)
- Add a GitHub Action to build the SDK in CI on push and commit/publish dist — so the bundle never depends on the local (pnpm-breaking) machine again. Mirrors how the dashboard builds on Vercel.

## HARDENING (before scale, not blocking)
- Payload validation (#6): validate playback-info shape (price is finite number; usdc_address/payment_router/chain_id present) at the boundary before use.
- Stale-connection handling (#8): add accountsChanged/chainChanged listeners; invalidate the module-cached _sharedWallet on account switch / disconnect (the dual-MetaMask / $0.00-vs-$49.31 confusion).
- Add an embedder RPC-override option (so embedders can supply a reliable mainnet RPC instead of the rate-limited public mainnet.base.org default).
- Add a real event API: JubJub.on(...) does not exist; the test harness relied on console interception. Expose events (ready/connecting/approved/session/settle/error/payment:required) for embedders.

## THE BIG BUILD — CONNECTOR LADDER (next major work; needs external accounts first)
Goal: serve an embedder's whole audience, not just desktop-injected wallets. Build the ladder: host-supplied provider -> injected (current) -> WalletConnect (mobile) -> walletless/embedded wallet.
PREREQUISITES (Tom must set up before building):
- A JubJub-owned WalletConnect/Reown projectId for the SDK (embedders can't each supply one), with allowed-domains handling for embedder origins. (Dashboard already has one: 62356fa06809f73c80206add9e664069 — decide reuse vs SDK-specific.)
- An embedded-wallet provider account (Privy or similar) for the walletless rung — currently a stub that throws.
- A gas-sponsorship decision for walletless viewers (they have no ETH; someone pays their gas).
- WalletConnect must be LAZY-LOADED (heavy dependency; don't make every embed pay the weight).
- The 'no wallet' gate (B) is the hook where the ladder plugs in.
- NOTE: this rung needs real-device TESTING (mobile, real origins), not just building.

## OPERATIONAL RUNBOOK (recurring)
- Every new contract deploy: verify on Basescan immediately + submit to Blockaid false-positive portal, BEFORE it's used (new+unverified = auto-flagged). Add to the deploy checklist.

## DEFERRED / SEPARATE
- Delete the stale docs/proposals/treasury-wallet-switch.md (false "custody unconfirmed" alarm — treasury is confirmed Tom-controlled, jubjub.base.eth).
- Decide fail-open vs fail-closed posture is now FAIL-CLOSED (done) — revisit only if it blocks legitimate viewers at scale.
