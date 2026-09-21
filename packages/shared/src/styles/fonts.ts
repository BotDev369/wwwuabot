/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THEME FONTS — безкоштовний набір родин, з яких людина обирає шрифт
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Шрифт — частина схеми теми (поряд із трьома кольорами), а не налаштування
 * бренду: характер (Apple / Material) задає типографіку *продукту*, а людина
 * обирає **свою**. Тому тут лише ті родини, які можна взяти безкоштовно
 * (Google Fonts, OFL) і які мають кирилицю — інакше український текст мовчки
 * випадав би в системну родину.
 *
 * **Чому лише id у сховищі.** У базі й у пам'яті лежить **ідентифікатор**
 * (`inter`, `lora`), а стек із фолбеками рахує `fontStack()`. Записати стек
 * означало б заморозити в даних те, що ми самі вирішили в коді: змінилась би
 * родина — старі схеми тягли б за собою мертвий стек.
 *
 * **Файл без DOM навмисно.** Тут — дані й чисті функції, тож цей модуль
 * імпортують і воркери (перевірка схеми на сервері), а робота з `<link>` і
 * `localStorage` живе в `./font-dom` (у воркера немає ані `document`, ані
 * `localStorage`, і одне значення з DOM затягло б у збірку все).
 *
 * @module packages/shared/src/styles/fonts
 */

/** Роль родини — щоб у списку вибору було видно, що то за шрифт. */
export type ThemeFontKind = "sans" | "serif" | "display" | "mono";

export interface ThemeFont {
  id: string;
  labelUk: string;
  /** Родина як її знає Google Fonts — те, що летить у посилання. */
  family: string;
  kind: ThemeFontKind;
  /** Стек після родини: далі браузер має куди відступити. */
  fallback: string;
}

/** Підписи груп у списку вибору — ті самі слова, що бачить людина. */
export const FONT_KIND_LABELS: Record<ThemeFontKind, string> = {
  sans: "Без засічок",
  serif: "Із засічками",
  display: "Акцидентні",
  mono: "Моноширинні",
};

const SANS_FALLBACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif';
const MONO_FALLBACK = 'ui-monospace, "SF Mono", Menlo, monospace';

/**
 * Список — **дані**, а не логіка. Порядок: спершу універсальні, далі
 * характерні; людина гортає його зверху вниз, тож першими стоять ті, з якими
 * не помилишся.
 */
export const THEME_FONTS: readonly ThemeFont[] = [
  { id: "inter", labelUk: "Inter", family: "Inter", kind: "sans", fallback: SANS_FALLBACK },
  { id: "manrope", labelUk: "Manrope", family: "Manrope", kind: "sans", fallback: SANS_FALLBACK },
  { id: "rubik", labelUk: "Rubik", family: "Rubik", kind: "sans", fallback: SANS_FALLBACK },
  { id: "nunito", labelUk: "Nunito", family: "Nunito", kind: "sans", fallback: SANS_FALLBACK },
  { id: "mulish", labelUk: "Mulish", family: "Mulish", kind: "sans", fallback: SANS_FALLBACK },
  { id: "golos", labelUk: "Golos", family: "Golos Text", kind: "sans", fallback: SANS_FALLBACK },
  { id: "onest", labelUk: "Onest", family: "Onest", kind: "sans", fallback: SANS_FALLBACK },
  {
    id: "montserrat",
    labelUk: "Montserrat",
    family: "Montserrat",
    kind: "display",
    fallback: SANS_FALLBACK,
  },
  {
    id: "unbounded",
    labelUk: "Unbounded",
    family: "Unbounded",
    kind: "display",
    fallback: SANS_FALLBACK,
  },
  {
    id: "comfortaa",
    labelUk: "Comfortaa",
    family: "Comfortaa",
    kind: "display",
    fallback: SANS_FALLBACK,
  },
  {
    id: "playfair",
    labelUk: "Playfair",
    family: "Playfair Display",
    kind: "serif",
    fallback: SERIF_FALLBACK,
  },
  { id: "lora", labelUk: "Lora", family: "Lora", kind: "serif", fallback: SERIF_FALLBACK },
  {
    id: "jetbrains",
    labelUk: "JetBrains Mono",
    family: "JetBrains Mono",
    kind: "mono",
    fallback: MONO_FALLBACK,
  },
];

/** Ключ у `localStorage`. Той самий підхід і префікс, що в трьох кольорів. */
export const FONT_KEY = "wwwuabot-font";

/** Ваги, які справді використовує продукт (`--weight-normal…bold`). */
export const FONT_WEIGHTS = "400;500;600;700";

/** Родина за id — або `null`, якщо id невідомий (звідкись зі старого сховища). */
export function themeFont(id: string | null | undefined): ThemeFont | null {
  if (!id) return null;
  return THEME_FONTS.find((font) => font.id === id) ?? null;
}

export function isThemeFontId(id: unknown): id is string {
  return typeof id === "string" && themeFont(id) !== null;
}

/** Назва родини для підпису («Lora») — або `null` для «як у стилі». */
export function fontLabel(id: string): string | null {
  return themeFont(id)?.labelUk ?? null;
}

/** Стек для CSS-змінної: родина в лапках, далі фолбек родини. */
export function fontStack(id: string): string | null {
  const font = themeFont(id);
  return font ? `"${font.family}", ${font.fallback}` : null;
}

/**
 * Адреса Google Fonts для набору родин. Одна адреса на весь набір — так
 * завантажуються й прев'ю списку вибору, і сам вибраний шрифт.
 */
export function fontCssUrl(ids: readonly string[], cssBase: string): string {
  const families = ids
    .map((id) => themeFont(id))
    .filter((font): font is ThemeFont => font !== null)
    .map((font) => `family=${font.family.replace(/ /g, "+")}:wght@${FONT_WEIGHTS}`);
  return `${cssBase}?${families.join("&")}&display=swap`;
}
