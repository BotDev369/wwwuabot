/**
 * Тема на екрані: атрибут на `<html>`, шрифт заголовків і памʼять пристрою.
 *
 * **Одна дія на всю тему.** Колір і шрифт не мають права розійтися: поки їх
 * застосовували два різні виклики, екран міг отримати нову палітру зі старою
 * типографікою. Тому `applyTheme()` ставить атрибут **і** шрифт, а зберігає
 * вибір лише після цього.
 *
 * Тема живе атрибутом, а не JS-стилями: CSS читає `data-theme`, тож жодного
 * кольору в розмітці немає, а картка-прев'ю може показати тему, поставивши
 * той самий атрибут на собі.
 */

import { applyDisplayFont } from "./font-dom";
import { DEFAULT_THEME, isThemeId, THEME_KEY, themeById, type Scheme } from "./registry";

/** Сміття від попередніх моделей вигляду: більше не читаємо, лише прибираємо. */
const DEAD_KEYS = ["wwwuabot-colors", "wwwuabot-font"] as const;

/** Вибір із памʼяті пристрою. Сміття й чуже значення — типова тема. */
export function readStoredTheme(): Scheme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Запис вибору. Невідомий ідентифікатор не пишеться — його немає в реєстрі. */
function saveStoredTheme(theme: Scheme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* приватний режим — вибір просто не переживе перезавантаження */
  }
}

/**
 * Застосувати тему: атрибут, шрифт заголовків, памʼять.
 *
 * `data-colors*` знімаються навмисно: вони лишились від трьох кольорів
 * людини, і теперішня палітра не мусить програвати мертвому селекторові.
 */
export function applyTheme(theme: Scheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  root.setAttribute("data-theme", theme);
  root.removeAttribute("data-colors");
  root.removeAttribute("data-colors-mode");
  applyDisplayFont(themeById(theme).display);
  saveStoredTheme(theme);
}

/** Забути вибір: продукт вертається до типової теми. */
export function clearStoredTheme(): void {
  try {
    localStorage.removeItem(THEME_KEY);
    for (const key of DEAD_KEYS) localStorage.removeItem(key);
  } catch {
    /* нічого не втрачено */
  }
  applyTheme(DEFAULT_THEME);
}
