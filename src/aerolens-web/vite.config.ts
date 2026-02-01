import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'
import path from 'path'

// https://vite.dev/config/
// Base path for subpath deployment (e.g., /aerolens)
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig(({ mode }) => ({
  base,
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.png', 'logo.svg'],
      manifest: {
        name: 'AeroLens - Real-time Flight Tracking',
        short_name: 'AeroLens',
        description: 'Track thousands of aircraft worldwide with AI-powered delay predictions',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        scope: base,
        start_url: base,
        categories: ['travel', 'utilities'],
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Search Flights',
            url: `${base}?action=search`,
            description: 'Search for flights by callsign',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
    // Brotli compression for production builds
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024, // Only compress files larger than 1KB
    }),
    // Gzip fallback for older browsers
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
    // Bundle visualizer - generates stats.html when ANALYZE=true
    mode === 'analyze' && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-leaflet': ['leaflet', 'react-leaflet', 'leaflet.markercluster'],
          'vendor-signalr': ['@microsoft/signalr'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Increase chunk size warning limit since we're splitting intentionally
    chunkSizeWarningLimit: 300,
  },
}))
