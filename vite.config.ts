import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// The bundle carries the version it was built from so a deployed copy can be
// told apart from src/ (dist/ is served by GitHub Pages). Surfaces as
// JubJub.version and in the init() console line.
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version: string };

export default defineConfig({
  define: {
    __JUBJUB_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // Two separate builds: UMD (script tag) and ESM (bundlers).
    // UMD uses umd-entry.ts which default-exports the JubJub class
    // so window.JubJub IS the class, not a namespace wrapper.
    lib: {
      entry: resolve(__dirname, 'src/umd-entry.ts'),
      name: 'JubJub',
      formats: ['umd'],
      fileName: () => 'jubjub-sdk.umd.js',
    },
    rollupOptions: {
      external: [],
      output: {
        exports: 'default',
      },
    },
    minify: 'esbuild',
    sourcemap: false,
  },
});
