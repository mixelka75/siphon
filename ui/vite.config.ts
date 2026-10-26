import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Собранный интерфейс кладём прямо в папку, которую Go встраивает в бинарник.
export default defineConfig({
  plugins: [react()],
  build: { outDir: '../internal/webui/dist', emptyOutDir: true, sourcemap: false },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://127.0.0.1:8484', ws: true, changeOrigin: false } },
  },
});
