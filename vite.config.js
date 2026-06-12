import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base path for GitHub Pages project site: https://<user>.github.io/Gym-Tracker/
const base = '/Gym-Tracker/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        id: base,
        name: 'Gym Tracker',
        short_name: 'GymTracker',
        description: 'Trainingspläne, Gewichte & Fortschritt tracken',
        lang: 'de',
        categories: ['health', 'fitness', 'sports'],
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg}', 'icons/*.png'],
        runtimeCaching: [
          {
            // Übungsbilder: nach erstem Abruf offline verfügbar, nicht im Precache
            urlPattern: ({ url }) => url.pathname.startsWith(`${base}exercise-images/`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
        ]
      }
    })
  ]
})
