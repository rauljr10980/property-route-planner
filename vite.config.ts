import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  // GitHub Pages base path - change 'PR' to your repository name if different
  base: process.env.GITHUB_ACTIONS ? '/PR/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})

