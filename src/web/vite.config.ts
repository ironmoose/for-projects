import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webfontDownload from "vite-plugin-webfont-dl";

export default defineConfig({
  plugins: [react(), webfontDownload()],
  resolve: {
    alias: {
      "@domain": path.resolve(__dirname, "../domain"),
    },
  },
  build: {
    outDir: "dist",
  },
  server: {
    port: 3002,
    proxy: {
      "/api": "http://localhost:3000",
      "/mcp": "http://localhost:3000",
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
});
