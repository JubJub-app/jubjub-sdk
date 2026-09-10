// Injected by vite.config.ts `define` from package.json at build time, so the
// shipped bundle carries the version it was built from (dist/ is what GitHub
// Pages serves; before this the only version marker was a hand-edited HTML
// comment). Not a runtime module: source that reads it must guard with
// `typeof __JUBJUB_VERSION__` so a non-vite compile still runs.
declare const __JUBJUB_VERSION__: string;
