import { defineConfig } from 'vite';

// The marketing site talks to the BAYWORKS CRM through a same-origin dev proxy,
// so the browser never hits a cross-origin (CORS) boundary in development.
// `/crm-api/*` on :5173  →  `http://localhost:3001/api/*`
export default defineConfig({
  server: {
    proxy: {
      '/crm-api': {
        target: process.env.VITE_CRM_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/crm-api/, '/api'),
      },
    },
  },
});
