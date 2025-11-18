import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  // GitHub Pages base path - matches repository name
  base: process.env.GITHUB_ACTIONS ? '/property-route-planner/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})

