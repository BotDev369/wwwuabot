/**
 * Шрифт на екрані: `<link>`, пам'ять пристрою й змінні на `<html>`.
 *
 * Окремо від `./fonts` — бо там дані, а тут браузер. Цю половину імпортують
 * лише ті, хто малює: воркери (перевірка схеми) беруть `./fonts`, і жодного
 * `document` у збірку не затягують.
 *
 * **Значення летять інлайном на `<html>`**, як і три кольори
 * (`./user-colors`): бренд оголошує `--font-ui` на `[data-brand][data-theme]`,
 * і перекрити його можна лише стилем елемента. Порожній вибір **знімає**
 * інлайнові змінні — тоді працює брендова типографіка, а не «шрифт-пустушка».
 *
 * @module packages/shared/src/styles/font-dom
 */

import { FONT_KEY, fontCssUrl, fontStack, isThemeFontId } from "./fonts";

const FONT_LINK_ID = "wb-font-link";
const PREVIEW_LINK_ID = "wb-font-previews";
const GOOGLE_CSS = "https://fonts.googleapis.com/css2";

/** Перехоплювані з'єднання: без них перший показ шрифту чекає на DNS. */
function ensurePreconnect(): void {
  for (const origin of ["https://fonts.googleapis.com", "https://fonts.gstatic.com"]) {
    if (document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    if (origin.endsWith("gstatic.com")) link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
}

/**
 * Своє посилання під кожен набір: активний шрифт і **перегляд** списку — різні
 * речі. Одне посилання на обидва означало б, що застосування шрифту стирає
 * прев'ю решти родин на сторінці вибору.
 */
function setLink(id: string, ids: readonly string[]): void {
  const existing = document.getElementById(id);
  if (ids.length === 0) {
    existing?.remove();
    return;
  }
  const link = (existing as HTMLLinkElement | null) ?? document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  const href = fontCssUrl(ids, GOOGLE_CSS);
  // Той самий href удруге не чіпаємо: перезапис перезапускав би завантаження.
  if (link.href !== href) link.href = href;
  if (!existing) document.head.appendChild(link);
}

/**
 * Завантажити родини для показу списку. Кличе сторінка вибору шрифту — саме
 * тому, що прев'ю мусить бути справжнім: підпис «Lora» набраний Lora.
 */
export function preloadFonts(ids: readonly string[]): void {
  if (typeof document === "undefined") return;
  ensurePreconnect();
  setLink(PREVIEW_LINK_ID, ids);
}

/** Прибрати прев'ю-родини, коли список закрито. */
export function releaseFontPreviews(): void {
  if (typeof document === "undefined") return;
  document.getElementById(PREVIEW_LINK_ID)?.remove();
}

/** Читання вибору з `localStorage` (поза браузером і при смітті — порожньо). */
export function readStoredFont(): string {
  try {
    const stored = localStorage.getItem(FONT_KEY);
    return isThemeFontId(stored) ? stored : "";
  } catch {
    return "";
  }
}

/** Запис вибору. Порожній — «як у стилі», і він **прибирає** ключ. */
export function saveStoredFont(id: string | null): void {
  try {
    if (isThemeFontId(id)) localStorage.setItem(FONT_KEY, id as string);
    else localStorage.removeItem(FONT_KEY);
  } catch {
    /* приватний режим — вибір просто не переживе перезавантаження */
  }
}

/**
 * Застосувати шрифт (або зняти його — порожній id).
 *
 * Інлайнові змінні на `<html>` перекривають бренд без `!important`, а знімання
 * змінної повертає його стек: бренд лишається джерелом типового.
 */
export function applyFont(id: string | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const stack = fontStack(id ?? "");

  if (!stack) {
    root.style.removeProperty("--font-ui");
    root.style.removeProperty("--font-display");
  } else {
    root.style.setProperty("--font-ui", stack);
    // Заголовки — та сама родина: вибір людини мусить бути видно на всьому
    // екрані, а не лише в дрібному тексті.
    root.style.setProperty("--font-display", stack);
  }

  ensurePreconnect();
  setLink(FONT_LINK_ID, stack && id ? [id] : []);
}
