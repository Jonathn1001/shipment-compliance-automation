import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The frontend talks to the backend through a dev proxy: browser calls
// `/api/shipments`, Vite forwards it to the NestJS server on :3000 (the `/api`
// prefix is stripped). This keeps the client origin-relative and CORS-free.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
