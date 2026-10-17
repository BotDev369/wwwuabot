import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";

import { telegramPreviewSession } from "./dev/telegram-session.ts";

import { createHash } from "crypto";

/** Post-process HTML to remove crossorigin and add build hash for cache busting. */
function fixHtml() {
  const buildHash = createHash("md5").update(Date.now().toString()).digest("hex").slice(0, 8);
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
  // `telegramPreviewSession()` стоїть першим: він реєструє свою адресу сесії
  // (`dev/telegram-session.ts`) у мідлварах раніше за плагін Cloudflare, який
  // інакше віддав би цей шлях воркеру.
  plugins: [telegramPreviewSession(), cloudflare(), react(), tailwindcss(), fixHtml()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: [".monkeycode-ai.live"],
    // Артефакти Playwright (трейси, знімки) лягають у корінь воркспейсу, і без
    // цього рядка Vite перезавантажує сторінку посеред прогону e2e.
    watch: { ignored: ["**/e2e-artifacts/**"] },
    proxy: {
      "/api": {
        // Локально API піднімається окремим `wrangler dev` на 8788, тож це
        // значення за замовчуванням. Кероване прев'ю не має права піднімати
        // другий процес (воно віддає зовні лише один порт), тому ціль
        // перекривається змінною — на задеплоєний дев-воркер.
        target: process.env.API_DEV_URL ?? "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
