/**
 * Applies the saved scheme **and the user's three colors** before the first
 * render to prevent flash.
 *
 * Called in main.tsx of each worker BEFORE createRoot().render().
 * Uses localStorage + CSS attributes only — works without React.
 *
 * Attribute format:
 *   <html data-brand="android" data-theme="light|dark"
 *         data-colors="custom" data-colors-mode="light|dark">
 *
 * `data-brand` — не вибір, а стиль продукту (див. `./registry`): його пишуть
 * разом зі схемою, і старих ключі вибору бренду (`wwwuabot-brand`,
 * `wwwuabot-style`) прибираємо, щоб мертвий вибір не читався знову.
 *
 * `data-colors*` появляється лише тоді, коли людина зберегла всі три кольори
 * («порожніх не буває» — див. `../styles/user-colors`): без атрибута працює
 * палітра стилю, а з ним її перекриває `user-colors.css`.
 *
 * No "system" mode — defaults to "dark" if nothing stored.
 */
import { BRAND } from "../styles/registry";
import { applyFont, readStoredFont } from "../styles/font-dom";
import { applyColors, readStoredColors } from "../styles/user-colors";
import { initTelegramChrome } from "./telegram-chrome";

const THEME_KEY = "wwwuabot-theme";

/** Ключі вибору бренду, яких більше немає: прибираємо, а не читаємо. */
const DEAD_BRAND_KEYS = ["wwwuabot-brand", "wwwuabot-style"];

export function initTheme(): void {
  try {
    // ── Стиль продукту — константа, вибору немає ──────────────────────────
    for (const key of DEAD_BRAND_KEYS) localStorage.removeItem(key);
    document.documentElement.setAttribute("data-brand", BRAND);

    // ── Resolve scheme (light/dark only, no system) ──────────────────
    const raw = localStorage.getItem(THEME_KEY);
    const scheme: "light" | "dark" = raw === "light" || raw === "dark" ? raw : "dark";
    document.documentElement.setAttribute("data-theme", scheme);
  } catch {
    /* ignore — localStorage may be unavailable */
  }

  // ── Три кольори користувача ──────────────────────────────────────
  // Тут, а не в React: палітра мусить стояти на `<html>` ДО першого рендера,
  // інакше екран мигне базовою темою. Немає вибору — немає атрибута, і працює
  // палітра стилю (див. `../styles/user-colors`).
  applyColors(readStoredColors());

  // ── Шрифт вибраної схеми ─────────────────────────────────────────
  // Теж тут і теж до першого рендера: інакше текст мигне типовою родиною
  // стилю (див. `../styles/fonts`).
  applyFont(readStoredFont());

  // Нативний хром Telegram (шапка/низ клієнта) — у кольорах цієї теми.
  // Поза Telegram — no-op. Див. `./telegram-chrome`.
  initTelegramChrome();
}
