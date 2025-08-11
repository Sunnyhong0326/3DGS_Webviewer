import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          next()
        })
      },
    },
  ],
  resolve: {
    // *** Ensure every import (including transitive) uses ONE copy of three ***
    dedupe: ['three'],
    alias: {
      three: path.resolve(__dirname, 'node_modules/three'),
    },
  },
  optimizeDeps: {
    // Make sure Vite prebundles the same three you aliased
    include: ['three'],
  },
})
