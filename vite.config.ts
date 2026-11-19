import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // chemins relatifs : le jeu marche sur GitHub Pages (sous-dossier), Netlify, ou tout autre hébergement statique
  base: './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Molinos y gigantes',
        short_name: 'Molinos',
        description: "Roguelike pour réviser l'espagnol (Presentarse con Don Quijote).",
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#1d1f33',
        theme_color: '#1d1f33',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // tout le jeu est mis en cache au premier chargement : il marche ensuite sans connexion
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // le paquet principal contient toute la banque de questions (≈ 120 Ko compressé) : c'est voulu
  build: { chunkSizeWarningLimit: 800 },
  test: { include: ['tests/**/*.test.ts'] },
} as never);
