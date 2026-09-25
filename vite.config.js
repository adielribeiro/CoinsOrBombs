import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Base relativo: o mesmo build funciona na raiz (Vercel), em
  // /CoinsOrBombs/ (GitHub Pages) e em qualquer subpasta, sem rebuild.
  base: './',
  plugins: [react()],
  build: {
    // O bundle de jogo não é alterado por deploy de código: mantém a
    // mesma URL entre releases e aproveita o cache do navegador.
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          react: ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
