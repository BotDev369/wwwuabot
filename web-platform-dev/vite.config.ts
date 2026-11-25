import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";

import { telegramPreviewSession } from "./dev/telegram-session.ts";
import { entryGatePlugin } from "@wwwuabot/shared/security/entry-gate-vite";

import { execSync } from "child_process";

/**
 * Мітка збірки: короткий git-хеш плюс час. Хеш дає відповідь «це той самий
 * білд?» (його видно і в HTML, і в `data-build` на `<html>`), час — щоб
 * `reloadOnNewBuild` бачив нову збірку навіть при тому самому коміті (дев-деплой).
 */
function buildStamp(): string {
  const sha = process.env.GITHUB_SHA ?? "";
  let head = sha.slice(0, 7);
  if (!head) {
    try {
      head = execSync("git rev-parse --short=7 HEAD", { encoding: "utf8" }).trim();
    } catch {
      head = "local";
    }
  }
  return `${head}-${Date.now().toString(36).slice(-4)}`;
}

/** Post-process HTML to remove crossorigin and add build hash for cache busting. */
function fixHtml() {
  const buildHash = buildStamp();
  return {
    name: "fix-html",
    enforce: "post",
    transformIndexHtml(html: string) {
      return html
        .replace(/\s+crossorigin/g, "")
        .replace(/<html lang="uk">/, `<html lang="uk" data-build="${buildHash}">`)
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
  plugins: [
    // Гейт стоїть першим: його стилі мають потрапити в голову до першого кадру.
    entryGatePlugin({ preview: true }),
    telegramPreviewSession(),
    cloudflare(),
    react(),
    tailwindcss(),
    fixHtml(),
  ],
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
    // Мапи не потрібні: браузерного Sentry немає, а шар асетів віддає все, що
    // лежить у `dist`, тож `.map` став би публічним файлом на 4 МБ (C1 в
    // `docs/CLOUDFLARE_AUDIT.md`). Джерела й так у репозиторії.
    sourcemap: false,
  },
});
