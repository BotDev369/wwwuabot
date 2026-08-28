import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";

import { createHash } from "crypto";

/** Post-process HTML to remove crossorigin and add build hash for cache busting. */
function fixHtml() {
  const buildHash = createHash("md5")
    .update(Date.now().toString())
    .digest("hex")
    .slice(0, 8);
  return {
    name: "fix-html",
    enforce: "post",
    transformIndexHtml(html: string) {
      return html
        .replace(/\s+crossorigin/g, "")
        .replace(
          /<title>([^<]*)<\/title>/,
          `<title>$1</title><meta name="x-build" content="${buildHash}">`,
        );
    },
  };
}

export default defineConfig({
  plugins: [cloudflare(), react(), tailwindcss(), fixHtml()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
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
