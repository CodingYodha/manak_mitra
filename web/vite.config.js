import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/chat': 'http://127.0.0.1:8000',
      '/verify': 'http://127.0.0.1:8000',
      '/labs': 'http://127.0.0.1:8000',
      '/stats': 'http://127.0.0.1:8000',
      '/graph': 'http://127.0.0.1:8000',
      '/passport': 'http://127.0.0.1:8000'
    }
  }
});
