import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy: frontend /api requests go to the backend.
    // Avoids CORS without any server-side configuration.
    proxy: {
      '/api': {
        target: 'http://localhost:6543', // Express server port
        changeOrigin: true,
      },
    },
  },
});
