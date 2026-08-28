import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Remove crossorigin attributes — Cloudflare CDN doesn't send CORS headers. */
function stripCrossorigin() {
  return {
    name: "strip-crossorigin",
    enforce: "post",
    transformIndexHtml(html: string) {
      return html.replace(/\s+crossorigin/g, "");
    },
  };
}

export default defineConfig({
  plugins: [react(), stripCrossorigin()],
  server: {
    allowedHosts: [".monkeycode-ai.live"],
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
