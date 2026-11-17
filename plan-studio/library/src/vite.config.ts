import { defineConfig } from 'vite';

// Relative base: the built page runs from /plan-studio/library/ on the lab and from any local folder.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
});
