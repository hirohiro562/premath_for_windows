import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // cargo writes to src-tauri/target while compiling; watching it causes
      // EBUSY crashes on Windows when Vite's watcher hits a locked DLL.
      ignored: ['**/src-tauri/**'],
    },
  },
})
