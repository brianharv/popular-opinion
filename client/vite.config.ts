import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: `http://127.0.0.1:${process.env.PORT ?? 3181}` },
      '/ws': {
        target: `ws://127.0.0.1:${process.env.PORT ?? 3181}`,
        ws: true,
        // Preserve Host so Fastify can verify the browser's Origin.
        changeOrigin: false,
      },
    },
  },
})
