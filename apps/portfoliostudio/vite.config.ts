import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Keep Vite/Oxc on Portfolio Studio's own TypeScript project when this app
  // is tested from the Surrey AI monorepo without the root dependencies.
  tsconfig: "./tsconfig.json",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (proxyRequest, request) => {
            // The development proxy terminates the browser's same-origin request.
            // Never rewrite an Origin supplied by a different website.
            if (request.headers.origin === "http://127.0.0.1:5173") {
              proxyRequest.setHeader("Origin", "http://127.0.0.1:8787");
            }
          });
        },
      },
    },
  },
  build: { sourcemap: false, chunkSizeWarningLimit: 650 },
});
