/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THEME REGISTRY — теми, які малюємо ми, а не людина
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Тема — це набір токенів, а не три довільні кольори.** Палітру, глибину,
 * акцент і шрифт заголовків задає дизайн-система (`styles/themes.css`), а тут
 * лежить лише те, що потрібно показати людині: ідентифікатор, назва, підказка
 * й світлота. Тому кожна тема має характер, але ролі кольору в ній ті самі,
 * що й у `tokens.css`: екран не доводиться вгадувати.
 *
 * **Чому не «світла / темна».** Двох станів мало: продукт із них виглядав
 * однаково сірим в обох. Тема тепер — це вибір настрою (день, папір, ніч,
 * океан, хвоя, слива), а світлота — її наслідок.
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
  /** Що це за настрій: підказка в картці, а не слоган. */
  hint: string;
  mode: ThemeMode;
  /** Шрифт заголовків (`styles/fonts.ts`); порожньо — родина продукту. */
  display: string;
}

/**
 * Список тем. Порядок — від світлих до темних: людина гортає його згори вниз,
 * і перехід між сусідніми темами не мусить бити по очах.
 */
export const THEMES = [
  {
    id: "light",
    label: "День",
    hint: "Тепле світло й теракота",
    mode: "light",
    display: "",
  },
  {
    id: "paper",
    label: "Папір",
    hint: "Крем, туш і засічки",
    mode: "light",
    display: "playfair",
  },
  {
    id: "dark",
    label: "Ніч",
    hint: "Вугілля й теплий акцент",
    mode: "dark",
    display: "",
  },
  {
    id: "ocean",
    label: "Океан",
    hint: "Синя глибина й бірюза",
    mode: "dark",
    display: "manrope",
  },
  {
    id: "forest",
    label: "Хвоя",
    hint: "Мох, кора й лаймовий акцент",
    mode: "dark",
    display: "golos",
  },
  {
    id: "plum",
    label: "Слива",
    hint: "Оксамит і мідь",
    mode: "dark",
    display: "montserrat",
  },
] as const satisfies readonly ThemeDefinition[];

/** Ідентифікатор теми — рівно те, що є в реєстрі. */
export type Scheme = (typeof THEMES)[number]["id"];

export type Theme = Scheme;

/** Ключ вибору в памʼяті пристрою — один на `initTheme`, `useStyleTheme` і меню. */
export const THEME_KEY = "wwwuabot-theme";

/** Без вибору продукт відкривається вночі: це його типовий настрій. */
export const DEFAULT_THEME: Scheme = "dark";

/** Чи рядок — ідентифікатор теми з реєстру (а не сміття зі сховища). */
export function isThemeId(value: unknown): value is Scheme {
  return typeof value === "string" && THEMES.some((theme) => theme.id === value);
}

/** Опис теми за ідентифікатором. Невідомий — типова. */
export function themeById(id: string): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME)!;
}
