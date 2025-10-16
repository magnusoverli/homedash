import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
