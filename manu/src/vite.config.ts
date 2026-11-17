import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// The JS for the Manu section. HTML is written by scripts/pages.mjs, which reads the manifest
// for the hashed file names. Served from /manu/ on the lab.
export default defineConfig({
  base: '/manu/',
  publicDir: false,
  build: {
    target: 'es2022',
    outDir: 'build/js',
    emptyOutDir: true,
    manifest: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        page: resolve(__dirname, 'src/viewer/page.ts'),
        compare: resolve(__dirname, 'src/viewer/compare.ts'),
      },
      output: { entryFileNames: 'assets/[name]-[hash].js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' },
    },
  },
});
