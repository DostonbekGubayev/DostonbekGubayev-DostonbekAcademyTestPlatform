
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

// .env faylidagi o'zgaruvchilarni process.env ga yuklash
dotenv.config();

export default defineConfig({
  plugins: [react()],
  define: {
    // Endi process.env.API_KEY .env faylidagi qiymatni oladi
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  server: {
    port: 3000,
    proxy: {
      '/api/': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
