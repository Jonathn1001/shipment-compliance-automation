import react from '@vitejs/plugin-react';
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

// The frontend talks to the backend through a dev proxy: browser calls
// `/api/shipments`, Vite forwards it to the NestJS server on :3000 (the `/api`
// prefix is stripped). This keeps the client origin-relative and CORS-free.
export default defineConfig({
  plugins: [react()],
  // Unit tests run in Node (Node 22 provides File/Blob globally), which is all
  // the pure lib/ parsers need — no jsdom until we add component tests.
  test: {
    environment: 'node',
    include: ['src/**/*.spec.{ts,tsx}'],
  },
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
