import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0',
    hmr: process.env.TAURI_DEV_HOST
      ? {
        protocol: "ws",
        host: process.env.TAURI_DEV_HOST,
        port: 1430,
      }
      : undefined,
  },
  plugins: [svelte()],
});
