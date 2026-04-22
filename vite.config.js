import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Cần thiết khi host trên Github Pages để load đúng resource
  server: {
    port: 3000,
    cors: true
  },
  build: {
    outDir: 'dist'
  }
});
