import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true, // Automatically open browser
    host: '0.0.0.0', // Listen on all network interfaces
    port: 8080
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
