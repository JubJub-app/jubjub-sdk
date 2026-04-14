import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'JubJub',
      formats: ['umd', 'es'],
      fileName: (format) => `jubjub-sdk.${format === 'umd' ? 'umd' : 'esm'}.js`,
    },
    rollupOptions: {
      // Bundle everything for UMD (self-contained script tag).
      // Peer deps are optional and excluded only if present.
      external: [],
    },
    minify: 'esbuild',
    sourcemap: true,
  },
});
