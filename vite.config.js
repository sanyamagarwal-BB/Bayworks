import { defineConfig } from 'vite';
import { resolve } from 'path';

// The marketing site talks to the BAYWORKS CRM through a same-origin dev proxy,
// so the browser never hits a cross-origin (CORS) boundary in development.
// `/crm-api/*` on :5173  →  `http://localhost:3001/api/*`
export default defineConfig({
  // Multi-page app: each HTML entry is its own page/route.
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        properties: resolve(__dirname, 'properties.html'),
        about: resolve(__dirname, 'about.html'),
        admin: resolve(__dirname, 'admin.html'),
        login: resolve(__dirname, 'login.html'),
        resetPassword: resolve(__dirname, 'reset-password.html'),
        acceptInvite: resolve(__dirname, 'accept-invite.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        partnerLogin: resolve(__dirname, 'partner-login.html'),
        partnerDashboard: resolve(__dirname, 'partner-dashboard.html'),
        developerLogin: resolve(__dirname, 'developer-login.html'),
        developerDashboard: resolve(__dirname, 'developer-dashboard.html'),
      },
    },
  },
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
