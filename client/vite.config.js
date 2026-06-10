import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Прокси: запросы с фронта на /api уходят на бэкенд.
    // Решает проблему CORS без единой строчки на сервере.
    proxy: {
      '/api': {
        target: 'http://localhost:6543', // Порт твоего Express-сервера
        changeOrigin: true,
      },
    },
  },
});