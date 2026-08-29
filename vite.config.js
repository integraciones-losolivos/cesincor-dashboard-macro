import { defineConfig } from 'vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const gatewayHeaders = env.GATEWAY_SHARED_SECRET
    ? { authorization: `Bearer ${env.GATEWAY_SHARED_SECRET}` }
    : {}

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          headers: gatewayHeaders,
        },
      },
    },
  }
})
