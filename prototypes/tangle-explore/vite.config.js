import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/tangle-lab/' : '/',
  plugins: [react()],
  server: {
    fs: {
      allow: [resolve(__dirname, '..')]
    }
  }
}));
