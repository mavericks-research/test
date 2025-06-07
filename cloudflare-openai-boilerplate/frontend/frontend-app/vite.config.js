import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787', // Default port for wrangler dev
        changeOrigin: true,
        // The rewrite rule has been removed
      }
    }
  }
})
