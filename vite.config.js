import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // CRITICAL for GitHub Pages:
  // Must match your repository name exactly (case-sensitive).
  // If repo is: https://github.com/user/dragon-of-combinatorics
  // then base must be: '/dragon-of-combinatorics/'
  base: '/dragon-of-combinatorics/',

  build: {
    outDir: 'dist',
    // Generate sourcemaps for easier debugging of production issues
    sourcemap: false,
    // Raise the chunk size warning limit slightly (game is a single component)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Keep asset names deterministic for caching
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
