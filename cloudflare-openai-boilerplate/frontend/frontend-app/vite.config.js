import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://worker-backend.lumexai.workers.dev', // Default port for 'wrangler dev'
        changeOrigin: true,
        // No rewrite needed as the worker expects /api prefix
      }
    }
  }
})
