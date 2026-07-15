/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Casino Layout Studio',
        short_name: 'CLS',
        description: 'Professional casino floor layout design and optimization studio.',
        theme_color: '#0b0e14',
        background_color: '#0b0e14',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@engine': path.resolve(__dirname, './src/engine'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@editor': path.resolve(__dirname, './src/editor'),
      '@commands': path.resolve(__dirname, './src/commands'),
      '@history': path.resolve(__dirname, './src/history'),
      '@selection': path.resolve(__dirname, './src/selection'),
      '@snap': path.resolve(__dirname, './src/snap'),
      '@constraints': path.resolve(__dirname, './src/constraints'),
      '@optimizer': path.resolve(__dirname, './src/optimizer'),
      '@import': path.resolve(__dirname, './src/import'),
      '@export': path.resolve(__dirname, './src/export'),
      '@ai': path.resolve(__dirname, './src/ai'),
      '@store': path.resolve(__dirname, './src/store'),
      '@components': path.resolve(__dirname, './src/components'),
      '@panels': path.resolve(__dirname, './src/panels'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@persistence': path.resolve(__dirname, './src/persistence'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
