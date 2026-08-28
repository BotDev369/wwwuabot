import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";

import { createHash } from "crypto";

/** Post-process HTML to:
 *  1. Remove crossorigin attrs (CDN doesn't send CORS headers)
 *  2. Inject build hash so browsers never serve stale HTML */
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
    proxy: {
      "/api": "http://localhost:8787",
      "/auth": "http://localhost:8787",
    },
  },
});
