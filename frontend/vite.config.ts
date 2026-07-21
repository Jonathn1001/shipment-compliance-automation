import react from '@vitejs/plugin-react';
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

// The frontend talks to the backend through a dev proxy: browser calls
// `/api/shipments`, Vite forwards it to the NestJS server (the `/api` prefix is
// stripped). This keeps the client origin-relative and CORS-free. The target is
// env-driven so the same config works on the host (localhost:3000) and inside
// docker compose, where the backend is reachable at `http://backend:3000`.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000';

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
        target: proxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
