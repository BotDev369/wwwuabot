/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TELEGRAM CHROME — нативна шапка й низ клієнта в кольорах нашої теми
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Проблема: наш хром (`.wb-app-header`, `.wb-tabbar`) фарбується токенами
 * `--bg-1` з брендової теми, а нативна шапка Telegram над Mini App і смуга
 * під ним — темою самого клієнта. Два різні кольори на одному екрані —
 * той шов, що «ріже око» (AGENTS.md §3, «Єдиний дизайн»).
 *
 * Рішення: кольори нативного хрома — теж токени. Брендова тема задає
 * `--chrome-header-bg` / `--chrome-bottom-bg` (плоскі hex, бо Telegram
 * приймає лише їх), а цей модуль читає їх і віддає клієнту через
 * `setHeaderColor` / `setBackgroundColor` / `setBottomBarColor`.
 *
 * Що синхронізує:
 *   шапка клієнта          ← `--chrome-header-bg`
 *   фон Mini App           ← `--chrome-header-bg` (щоб не мигало іншим кольором
 *                             під час скролу за межі viewport)
 *   смуга під Mini App     ← `--chrome-bottom-bg` (те саме місце, що й футер)
 *
 * Коли: старт застосунку (разом з `initTheme()`), кожна зміна `data-brand` /
 * `data-theme` (MutationObserver) і подія клієнта `themeChanged` (користувач
 * повернув тему Telegram у налаштуваннях).
 *
 * Поза Telegram (звичайний браузер, тести) модуль — no-op: без `window`
 * і без `window.Telegram.WebApp` він нічого не робить і нічого не ламає.
 *
 * @module packages/shared/src/app/telegram-chrome
 */

import type { TelegramChromeColor, TelegramWebApp } from "../types/telegram";

/** Подія клієнта, яку Telegram шле при зміні теми в налаштуваннях. */
const THEME_CHANGED_EVENT = "themeChanged";

/**
 * DOM-атрибути, за якими ми стежимо — їх ставлять `initTheme()` / `useStyleTheme()`
 * і вибір трьох кольорів (`applyColors`: `data-colors` / `data-colors-mode`).
 * Без останніх двох хром не перефарбувався б, доки людина рухає повзунок у
 * панелі теми — а саме тоді це видніше за все.
 */
const OBSERVED_ATTRS = ["data-brand", "data-theme", "data-colors", "data-colors-mode"] as const;

/**
 * Зчитує плоский колір з CSS-змінної на `<html>`.
 *
 * Чому `getComputedStyle`, а не власна таблиця «бренд × схема → колір»:
 * таблиця задублювала б значення з `apple.css`/`android.css`, і рано чи пізно
 * хтось оновив би CSS і забув TS — а це саме той клас розсинхрону, який у
 * проєкті ловлять гейти, а не очі. `#f00` розгортається до `#ff0000`: старі
 * клієнти Telegram траплялись і на 3-значних значеннях.
 *
 * Повертає `undefined`, коли змінної немає або значення не схоже на колір —
 * тоді виклик до Telegram просто не робиться (нічого не ламає).
 */
export function readChromeColor(name: string): TelegramChromeColor | undefined {
  if (typeof getComputedStyle !== "function" || typeof document === "undefined") return undefined;

  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return normalizeChromeColor(raw);
}

/**
 * Приводить значення CSS-змінної до `#rrggbb`, який приймає Telegram.
 * Експортовано для тестів: невалідне (градієнт, порожнє, `var(...)`) → `undefined`.
 */
export function normalizeChromeColor(raw: string): TelegramChromeColor | undefined {
  const value = raw.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(value)) return undefined;
  return value as TelegramChromeColor;
}

/**
 * Шле клієнту три методи кольору. Окрема чиста функція — щоб тести могли
 * підсунути фейковий WebApp і перевірити сам набір викликів, без DOM.
 *
 * Кожен виклик у власному `try`: Telegram на старих версіях кидає виняток на
 * незнайомий метод, і падіння одного не повинно зривати решту.
 */
export function applyChromeColors(
  webApp: Pick<TelegramWebApp, "setHeaderColor" | "setBackgroundColor" | "setBottomBarColor">,
  header: TelegramChromeColor,
  bottom: TelegramChromeColor,
): void {
  try {
    webApp.setHeaderColor?.(header);
  } catch {
    /* клієнт не знає методу — лишаємо його колір */
  }
  try {
    webApp.setBackgroundColor?.(header);
  } catch {
    /* те саме */
  }
  try {
    webApp.setBottomBarColor?.(bottom);
  } catch {
    /* те саме */
  }
}

/** Зчитує обидва токени; `undefined`, коли CSS ще не підвантажився. */
export function readChromeColors():
  { header: TelegramChromeColor; bottom: TelegramChromeColor } | undefined {
  const header = readChromeColor("--chrome-header-bg");
  const bottom = readChromeColor("--chrome-bottom-bg");
  if (!header || !bottom) return undefined;
  return { header, bottom };
}

/** Чи WebApp схожий на справжній: має хоча б один метод кольору. */
export function isTelegramWebApp(value: unknown): value is TelegramWebApp {
  if (typeof value !== "object" || value === null) return false;
  const app = value as Partial<TelegramWebApp>;
  return (
    typeof app.setHeaderColor === "function" ||
    typeof app.setBackgroundColor === "function" ||
    typeof app.setBottomBarColor === "function"
  );
}

/**
 * Реєструє зміну теми: один синхронізаційний прохід + спостерігач.
 *
 * Повертає функцію відписки (для тестів і hot-reload); у застосунку вона
 * не викликається — модуль живе стільки, скільки сторінка.
 *
 * Немає WebApp, немає `document` або немає `MutationObserver` — no-op,
 * який повертає `() => undefined`.
 */
export function initTelegramChrome(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => undefined;

  const webApp = window.Telegram?.WebApp;
  if (!isTelegramWebApp(webApp)) return () => undefined;

  // Перший прохід: CSS вже підвантажений (імпорт у index.css стоїть до рендеру).
  const sync = () => {
    const colors = readChromeColors();
    if (colors) applyChromeColors(webApp, colors.header, colors.bottom);
  };

  sync();
  webApp.ready?.();

  // Один кадр по тому — ще раз: у dev CSS доливається модулем (може встигнути
  // пізніше за перший sync), а частина клієнтів застосовує колір лише після ready.
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => sync());
  }

  const observer = typeof MutationObserver === "function" ? new MutationObserver(sync) : undefined;
  observer?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [...OBSERVED_ATTRS],
  });

  // Користувач повернув тему Telegram у налаштуваннях — перечитуємо токени
  // (CSS не зміниться, але в момент події клієнт скидає свій хром).
  const onThemeChanged = () => sync();
  try {
    webApp.onEvent?.(THEME_CHANGED_EVENT, onThemeChanged);
  } catch {
    /* подій немає в цього клієнта — ок */
  }

  return () => {
    observer?.disconnect();
    try {
      webApp.offEvent?.(THEME_CHANGED_EVENT, onThemeChanged);
    } catch {
      /* ignore */
    }
  };
}
