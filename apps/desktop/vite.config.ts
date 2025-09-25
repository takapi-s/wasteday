import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    fs: {
      // Allow serving files from monorepo packages (e.g., @wasteday/ui)
      allow: [
        '..',
        path.resolve(__dirname, '../../packages/ui'),
      ]
    }
  },
  resolve: {
    alias: {
      // Use source of @wasteday/ui during dev for immediate reflection
      '@wasteday/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
    dedupe: ['react', 'react-dom'],
  },
}));
