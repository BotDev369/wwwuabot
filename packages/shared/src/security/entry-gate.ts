/**
 * Гейт першого кадру «лише Telegram Mini App»: один текст скрипта й один набір
 * стилів на обидві оболонки. У `index.html` їх немає — сторінка просить
 * `entryGatePlugin()` у `vite.config.ts`, і той вставляє скрипт першим у тіло, а
 * стилі в голову ще на етапі HTML. Так дві копії не розходяться.
 *
 * @module packages/shared/src/security/entry-gate
 */

/**
 * Атрибут `<html>`, який ставить гейт: продукт у цьому вікні не показуємо.
 * Власник контракту — тут, бо гейт першого кадру пише його найпершим;
 * `mini-app` реекспортує його для коду й тестів.
 */
export const WEB_BLOCK_ATTR = "data-web-block";

/** Єдина відмінність оболонок: ключ прев'ю є лише в платформи. */
export interface EntryGateOptions {
  /** `?preview=<ключ>` або ключ у сховищі вкладки знімає блок (дев-вхід). */
  preview?: boolean;
}

/**
 * Текст інлайнового скрипта: він вирішує до першого кадру й до бандла.
 *
 * `initData` лежить у фрагменті адреси, який сервер не бачить, тож вирішує
 * клієнт; дані все одно закриває підпис у `api-dev`.
 */
export function entryGateScript(options: EntryGateOptions = {}): string {
  const preview = options.preview
    ? `
        var preview = false;
        try {
          preview =
            new URLSearchParams(location.search).has("preview") ||
            !!sessionStorage.getItem("preview-session-key");
        } catch (e) {}`
    : `
        var preview = false;`;

  return `(function () {
        var initData = "";
        try {
          var app = window.Telegram && window.Telegram.WebApp;
          initData = (app && typeof app.initData === "string" && app.initData) || "";
        } catch (e) {}${preview}
        var local =
          location.hostname === "localhost" ||
          location.hostname === "127.0.0.1" ||
          location.hostname === "[::1]";
        if (!initData && !preview && !local) {
          document.documentElement.setAttribute(${JSON.stringify(WEB_BLOCK_ATTR)}, "");
        }
      })();`;
}

/**
 * Стилі блока й приховування продукту. Вони мусять стояти в голові до першого
 * кадру: інакше обкладинка встигає блимнути, поки вантажиться бандл.
 */
export const ENTRY_GATE_STYLES = `html[data-web-block] #root{display:none}
.wb-entry-block{display:none}
html[data-web-block] body{margin:0;background:#f6f1e7;color:#1b2430;font-family:"Onest","Inter",system-ui,-apple-system,"Segoe UI",sans-serif}
html[data-web-block] .wb-entry-block{display:flex;box-sizing:border-box;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:100dvh;padding:calc(28px + env(safe-area-inset-top)) 24px calc(28px + env(safe-area-inset-bottom));text-align:center;background:radial-gradient(120% 60% at 50% 0,#fffdf8 0%,#f6f1e7 60%,#efe6d6 100%)}
.wb-entry-block-mark{font-size:28px;line-height:1;color:#a06239}
.wb-entry-block-kicker{margin:6px 0 0;font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:#9a8a68}
.wb-entry-block-title{margin:0;font-size:clamp(26px,8vw,34px);font-weight:700;line-height:1.1;color:#171d26}
.wb-entry-block-text{margin:2px 0 0;max-width:32ch;font-size:15px;line-height:1.5;color:#5f6873}`;
