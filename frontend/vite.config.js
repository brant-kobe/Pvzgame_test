import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, "..");

export default defineConfig({
  root: dirname,
  plugins: [react()],
  build: {
    outDir: path.resolve(dirname, "dist"),
    emptyOutDir: true,
    assetsDir: "app-assets",
    rollupOptions: {
      input: path.resolve(dirname, "index.html"),
      output: {
        manualChunks: function (id) {
          if (id.indexOf("node_modules") >= 0 && id.indexOf("react") >= 0) return "react-vendor";
          if (id.indexOf("node_modules") >= 0) return "vendor";
          return null;
        }
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: { allow: [projectRoot] },
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/assets": "http://127.0.0.1:8787",
      "/pictures": "http://127.0.0.1:8787"
    }
  }
});
