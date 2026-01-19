import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Enable polling for file watching in Docker
      // Required when running on Windows/Mac with Docker bind mounts
      usePolling: true,
      // Check for changes every 1000ms (1 second)
      interval: 1000,
    },
    // Ensure HMR works through Docker
    hmr: {
      // Use the host's port (5174) for HMR websocket connections
      clientPort: 5174,
    },
  },
})
