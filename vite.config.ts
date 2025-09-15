import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  server: { host: true, port: 5173,strictPort: true, allowedHosts: [".gitpod.io"] },
  preview: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      input: {
        admin: resolve(__dirname, "admin.html"),
        qr: resolve(__dirname, "qr.html"),
        index: resolve(__dirname, "index.html"),
      },
    },
  },
});