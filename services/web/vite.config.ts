import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import Sitemap from 'vite-plugin-sitemap'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    Sitemap({
      hostname: 'https://manhquy.click',
      dynamicRoutes: [
        '/',
        '/login',
        '/register',
        '/pricing',
        '/features',
        '/docs',
        '/privacy-policy',
        '/terms-of-service',
        '/acceptable-use',
        '/gdpr'
      ],
      generateRobotsTxt: false, // We manage robots.txt manually
      lastmod: new Date(),
      changefreq: 'weekly',
      priority: 0.8,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Ephemera - Email Tạm Thời Chuyên Nghiệp',
        short_name: 'Ephemera',
        description: 'Nền tảng email tạm thời cao cấp với thiết kế Nebula Glass',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone', // Forces app-like behavior (no browser UI)
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        importScripts: ['/push-sw.js']
      }
    })
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
})
