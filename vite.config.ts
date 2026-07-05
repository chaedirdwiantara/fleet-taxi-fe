/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    // router plugin must run before the react plugin
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Same-origin dev proxy so session cookies flow without cross-subdomain
    // CORS gymnastics (frontend-kickoff.md §9). In dev:
    //   VITE_API_BASE_URL=/api  and  VITE_WS_URL=/rt
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      '/rt': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // only this repo's tests — the backend repo is checked out as a sibling
    // folder during local dev and has its own vitest setup
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    env: {
      VITE_API_BASE_URL: 'http://localhost:3000',
      VITE_WS_URL: 'ws://localhost:3000/rt',
      VITE_APP_ENV: 'local',
      VITE_USE_MSW: 'false',
    },
  },
});
