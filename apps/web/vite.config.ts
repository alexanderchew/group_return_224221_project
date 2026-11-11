import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.LECTURE_API_TARGET || 'http://127.0.0.1:8000';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(apiTarget)) throw new Error('The development proxy must target a loopback API.');
export default defineConfig({
  plugins: [react()],
  // Keep operator provisioning, readable CSRF cookie, media and API on one origin.
  // Never proxy providers or expose the laptop service to the public internet.
  server: {
    proxy: {
      '/api/v1': { target: apiTarget, changeOrigin: false },
      '/operator': { target: apiTarget, changeOrigin: false },
    },
  },
});
