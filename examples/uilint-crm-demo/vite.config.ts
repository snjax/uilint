import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

export default defineConfig({
  plugins: [
    svelte({
      onwarn(warning, handler) {
        if (warning.code === 'a11y-no-static-element-interactions') {
          return;
        }
        if (handler) {
          handler(warning);
        }
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        login: path.resolve(__dirname, 'index.html'),
        dashboard: path.resolve(__dirname, 'dashboard.html'),
        crm: path.resolve(__dirname, 'crm.html'),
      },
    },
  },
  server: {
    port: 4173,
    host: '0.0.0.0',
    strictPort: true,
  },
  preview: {
    port: 4173,
    host: '127.0.0.1',
    strictPort: true,
  },
});

