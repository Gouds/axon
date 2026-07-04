import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws':      { target: 'ws://localhost:8000', ws: true, changeOrigin: true },
      '/profiles':{ target: 'http://localhost:8000', changeOrigin: true },
      '/config':  { target: 'http://localhost:8000', changeOrigin: true },
      '/action':  { target: 'http://localhost:8000', changeOrigin: true },
      '/plugins': { target: 'http://localhost:8000', changeOrigin: true },
      '/health':  { target: 'http://localhost:8000', changeOrigin: true },
      '/status':  { target: 'http://localhost:8000', changeOrigin: true },
      '/assets':  { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
  },
})
