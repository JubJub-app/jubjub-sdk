// Ambient shim for the OPTIONAL peer dependency `@privy-io/js-sdk-core`.
//
// It is referenced ONLY by a dynamic `import('@privy-io/js-sdk-core')` in
// src/core/Wallet.ts and is marked optional in package.json
// (peerDependenciesMeta). The package is intentionally NOT installed in this
// repo, so the `tsc --emitDeclarationOnly` declaration pass would otherwise
// fail with "Cannot find module '@privy-io/js-sdk-core'".
//
// Declaring it as an untyped ambient module lets tsc resolve the dynamic import
// (typed as `any`) so the build exits clean — WITHOUT adding Privy as a real
// dependency and WITHOUT changing the runtime lazy-load behaviour (it still
// only loads if the package is actually present at runtime).
declare module '@privy-io/js-sdk-core';
