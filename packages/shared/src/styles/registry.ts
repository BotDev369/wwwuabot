/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THEME REGISTRY — дві теми: світла й темна
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Тем рівно дві.** Світла живе в `styles/tokens.css`, темна — у
 * `styles/themes.css`. Жодних «настроїв», галерей і авторських наборів: людина
 * перемикає світло, а не обирає характер продукту.
 *
 * **Тема не міняє шрифт.** Типографіка продукту одна на обидві теми: інакше
 * перемикання світла переписувало заголовки, і той самий екран виглядав іншим
 * продуктом.
 *
 * Файл **без DOM**: його читає і сервер, і клієнт. Застосування — у
 * `styles/theme-dom.ts`.
 */

/** Світлота теми: потрібна хрому Telegram і нативним контролам. */
export type ThemeMode = "light" | "dark";

export interface ThemeDefinition {
  /** Значення `data-theme` і ключ у памʼяті пристрою. */
  id: string;
  /** Назва для людини — одне слово. */
  label: string;
  /** Коротке пояснення стану перемикача. */
  hint: string;
  mode: ThemeMode;
}

/** Дві теми. Порядок — світла, темна: так само, як у перемикачі. */
export const THEMES = [
  {
    id: "light",
    label: "Світла",
    hint: "Денний вигляд",
    mode: "light",
  },
  {
    id: "dark",
    label: "Темна",
    hint: "Нічний вигляд",
    mode: "dark",
  },
] as const satisfies readonly ThemeDefinition[];

/** Ідентифікатор теми — рівно те, що є в реєстрі. */
export type Scheme = (typeof THEMES)[number]["id"];

export type Theme = Scheme;

/** Ключ вибору в памʼяті пристрою — один на `initTheme`, `useStyleTheme` і перемикач. */
export const THEME_KEY = "wwwuabot-theme";

/** Без вибору й без підказки системи продукт відкривається вночі. */
export const DEFAULT_THEME: Scheme = "dark";

/** Чи рядок — ідентифікатор теми з реєстру (а не сміття зі сховища). */
export function isThemeId(value: unknown): value is Scheme {
  return typeof value === "string" && THEMES.some((theme) => theme.id === value);
}

/** Опис теми за ідентифікатором. Невідомий — типова. */
export function themeById(id: string): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME)!;
}
