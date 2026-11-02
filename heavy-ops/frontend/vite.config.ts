import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Minifie le JS (esbuild) et le CSS au build de production.
    // Répond au diagnostic Lighthouse « Minify JavaScript ».
    minify: 'esbuild',
    cssMinify: true
  },
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': 'http://localhost:4100',
      '/assets': 'http://localhost:4100'
    }
  },
  preview: {
    // Sert le build de production avec le meme proxy que le dev,
    // pour mesurer la version minifiee avec l'API qui fonctionne.
    port: 4173,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
    // Pas de proxy '/assets' ici : le build place son JS et son CSS dans /assets,
    // les rediriger vers le backend les rendait introuvables (page blanche).
    proxy: {
      '/api': 'http://localhost:4100'
    }
  }
});
