import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"]
  },
  build: {
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");

          if (normalizedId.includes("/node_modules/three/")) {
            return "vendor-three";
          }

          if (normalizedId.includes("/node_modules/@react-three/fiber/")) {
            return "vendor-react-three-fiber";
          }
        }
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4174"
    }
  }
});
