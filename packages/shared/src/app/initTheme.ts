/**
 * Застосовує вибрану тему **до першого рендера** — щоб екран не мигнув іншим
 * настроєм.
 *
 * Викликається в `main.tsx` кожної оболонки перед `createRoot().render()`.
 * Працює на `localStorage` і CSS-атрибуті — без React, без мережі.
 *
 * Формат на `<html>`:
 *   `data-theme="light|paper|dark|ocean|forest|plum"`
 *
 * **Тема — авторська.** Три кольори людини, редактор і бібліотеки тем
 * прибрані: вибір тепер між наборами, які малює дизайн-система. Тому тут
 * лишилась рівно одна дія — `applyTheme()`, яка ставить палітру й шрифт
 * заголовків разом.
 *
 * Старі ключі вибору (`wwwuabot-colors`, `wwwuabot-font`, `wwwuabot-brand`,
 * `wwwuabot-style`) прибираються, щоб мертвий вибір не читався знову.
 */
import { readStoredTheme } from "../styles/theme-dom";
import { applyTheme } from "../styles/theme-dom";
import { initTelegramChrome } from "./telegram-chrome";

/** Ключі попередніх моделей вигляду: їх більше немає — прибираємо. */
const DEAD_KEYS = ["wwwuabot-brand", "wwwuabot-style", "wwwuabot-colors", "wwwuabot-font"];

export function initTheme(): void {
  try {
    for (const key of DEAD_KEYS) localStorage.removeItem(key);
  } catch {
    /* localStorage може бути недоступним — тема все одно застосується */
  }

  // Палітра й шрифт заголовків — однією дією, до першого рендера.
  applyTheme(readStoredTheme());

  // Нативний хром Telegram (шапка/низ клієнта) — у кольорах цієї теми.
  // Поза Telegram — no-op. Див. `./telegram-chrome`.
  initTelegramChrome();
}
