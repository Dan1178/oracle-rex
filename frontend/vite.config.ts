/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// This app is served by Django/WhiteNoise on the same single Render web service
// as the API — no separate host, no CORS. Vite builds hashed assets into `dist/`
// (with a manifest); django-vite reads the manifest and emits the asset tags
// from a Django template. See oracle-rex/settings.py (DJANGO_VITE) and
// templates/spa.html.
export default defineConfig({
  plugins: [react()],
  // Built assets are served by Django under STATIC_URL (/static/), so every
  // emitted URL must be prefixed accordingly.
  base: '/static/',
  build: {
    // Emit dist/.vite/manifest.json so django-vite can resolve the hashed
    // filenames for production asset tags.
    manifest: true,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Django renders the HTML shell (templates/spa.html); the JS module is the
      // only build input, referenced from that template via {% vite_asset %}.
      input: 'src/main.tsx',
    },
  },
  server: {
    port: 5173,
    // Standalone dev (visiting the Vite server at :5173 directly) proxies API
    // calls to Django. The primary dev flow instead visits Django at :8000 with
    // DJANGO_VITE_DEV_MODE=1, where /api is already same-origin.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
