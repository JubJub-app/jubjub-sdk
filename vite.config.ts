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
      external: [],
    },
    minify: 'esbuild',
    sourcemap: true,
  },
});
