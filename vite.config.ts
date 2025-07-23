import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.pag', '**/*.wasm'],
  server: {
    fs: {
      allow: ['..']
    }
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined
      }
    }
  },
  publicDir: 'public',
  optimizeDeps: {
    exclude: ['libpag']
  }
})
