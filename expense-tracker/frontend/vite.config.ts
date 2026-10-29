import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The backend the dev server forwards to. UI-check lanes set API_TARGET to their own backend port.
const apiTarget = process.env.API_TARGET ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the FastAPI dev server, so no CORS setup is needed.
    proxy: {
      '/api': apiTarget,
    },
  },
})
