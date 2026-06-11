import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Porta fixa: garante UMA única URL para os dois painéis (Nairuz e cliente).
    // Origens diferentes (portas diferentes) têm localStorage separado e não
    // sincronizam — por isso fixamos aqui.
    port: 4321,
    strictPort: true,
  },
})
