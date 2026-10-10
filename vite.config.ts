import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Allow 3D / HDR files to be imported from src/assets as URLs.
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr', '**/*.exr', '**/*.ktx2'],
  build: {
    // three.js + R3F ship as one lazy-loaded chunk (~900 kB min / ~240 kB gzip) — expected.
    chunkSizeWarningLimit: 1000,
  },
})
