/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHROME COLOR — колір шапки, який назвав сам клієнт
 * ═══════════════════════════════════════════════════════════════════════════
 * Шов був не через «неправильний hex», а через **здогад**: ми малювали свою
 * таблицю, а клієнт — свій колір. `publishAppbarColor()` — єдина точка, яка
 * вирішує, чим фарбувати смугу; її ж читають `.wb-appbar` і верхівка.
 *
 * @module packages/shared/src/app/chrome-color
 */

import type { TelegramChromeColor, TelegramWebApp } from "../types/telegram";

/**
 * Атрибут на `<html>`, яким екран просить власний колір шапки клієнта.
 * Значення `hero` — обкладинка головної: її графіка впирається в самий верх,
 * тож шапка клієнта мусить бути кольором цієї графіки, а не кольором теми.
 */
export const CHROME_ATTR = "data-chrome";

/** Змінні, якими смуга й верхівка беруть **фактичний** колір шапки клієнта. */
const APPBAR_VAR = "--chrome-appbar-bg";
const APPBAR_INK_VAR = "--chrome-appbar-ink";

/** JS-дзеркала `themeParams`: SDK публікує їх CSS-змінними. */
const CLIENT_HEADER_VAR = "--tg-theme-header-bg-color";
const CLIENT_BG_VAR = "--tg-theme-bg-color";

/**
 * Плоский колір зі змінної на `<html>` (не з власної таблиці: вона б
 * розійшлася з `themes.css`). `undefined`, коли змінної немає — тоді виклику
 * до Telegram просто не буде.
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
  if (/^#[0-9a-f]{6}$/.test(value)) return value as TelegramChromeColor;
  // `#rgb` — старі клієнти; `#rrggbbaa` — колір з альфою, альфу відкидаємо
  // (`setHeaderColor` її не приймає, а шапка клієнта непрозора).
  if (/^#[0-9a-f]{3}$/.test(value)) {
    const [r, g, b] = value.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}` as TelegramChromeColor;
  }
  if (/^#[0-9a-f]{8}$/.test(value)) return value.slice(0, 7) as TelegramChromeColor;
  const rgb = value.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (!rgb) return undefined;
  const hex = rgb
    .slice(1, 4)
    .map((part) => Math.min(255, Number(part)).toString(16).padStart(2, "0"));
  return `#${hex.join("")}` as TelegramChromeColor;
}

/**
 * Зчитує токени; `undefined`, коли CSS ще не підвантажився.
 *
 * `background` — завжди колір теми: його видно на прокрутці за межі вмісту, і
 * колір обкладинки там був би плямою. `header` на обкладинці бере свій токен.
 */
export interface ChromeColors {
  header: TelegramChromeColor;
  background: TelegramChromeColor;
  bottom: TelegramChromeColor;
}

/**
 * Колір шапки, який **назвав клієнт**: `header_bg_color` (Bot API 7.0+), далі
 * `bg_color`, далі токен теми. Поля немає — шапку примусово ставимо на
 * `bg_color` ключем, тож і це не здогад.
 */
export type ClientHeaderSource = "header_bg_color" | "bg_color" | "theme";

export interface ClientHeader {
  color: TelegramChromeColor;
  source: ClientHeaderSource;
}

export function readClientHeader(
  webApp?: Pick<TelegramWebApp, "themeParams">,
): ClientHeader | undefined {
  const params = webApp?.themeParams ?? {};
  const header =
    normalizeChromeColor(params.header_bg_color ?? "") ?? readChromeColor(CLIENT_HEADER_VAR);
  if (header) return { color: header, source: "header_bg_color" };

  const background = normalizeChromeColor(params.bg_color ?? "") ?? readChromeColor(CLIENT_BG_VAR);
  if (background) return { color: background, source: "bg_color" };

  const theme = readChromeColor("--chrome-header-bg");
  return theme ? { color: theme, source: "theme" } : undefined;
}

/**
 * Яким кольором читаються підписи на смузі цього кольору: похідна від самої
 * смуги, тому контраст тримається і на світлій, і на темній шапці клієнта.
 * Повертає `undefined`, коли колір не розібрати — тоді працюють токени теми.
 */
export function chromeInk(color: TelegramChromeColor): TelegramChromeColor | undefined {
  const hex = normalizeChromeColor(color);
  if (!hex) return undefined;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Світла шапка → темний підпис, темна → світлий: обидва краї далеко від 4.5:1.
  return luminance > 0.55 ? "#1d1a2b" : "#ffffff";
}

/** Колір смуги на `<html>`: його ж читає верхівка — шов неможливий. */
export function publishAppbarColor(color: TelegramChromeColor): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty(APPBAR_VAR, color);
  const ink = chromeInk(color);
  if (ink) root.style.setProperty(APPBAR_INK_VAR, ink);
  else root.style.removeProperty(APPBAR_INK_VAR);
}

/** Колір, який зараз намальований на смузі (для діагностики й тестів). */
export function readAppbarColor(): TelegramChromeColor | undefined {
  if (typeof document === "undefined") return undefined;
  return normalizeChromeColor(document.documentElement.style.getPropertyValue(APPBAR_VAR));
}

/** Виконати після паузи: клієнт підтверджує колір не в тому ж кадрі. */
export function afterDelay(run: () => void, ms: number): void {
  if (typeof setTimeout === "function") setTimeout(run, ms);
  else run();
}

export function readChromeColors(): ChromeColors | undefined {
  const background = readChromeColor("--chrome-header-bg");
  const bottom = readChromeColor("--chrome-bottom-bg");
  if (!background || !bottom) return undefined;
  const heroAttr =
    typeof document === "undefined" ? null : document.documentElement.getAttribute(CHROME_ATTR);
  const hero = heroAttr === "hero" ? readChromeColor("--chrome-hero-header-bg") : undefined;
  // Тон розділу — той самий, що в нашого хедера й верхівки графіки.
  const section = readChromeColor("--chrome-section-bg");
  return { header: hero ?? section ?? background, background, bottom };
}
