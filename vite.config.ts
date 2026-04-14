import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
