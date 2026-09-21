/**
 * `useThemeLook` — поточний вибір для пунктів хабу теми.
 *
 * **Хаб показує стан, а не пояснення.** Щоб пункт «Готові теми» сказав, яка
 * тема діє, потрібні **обидві** бібліотеки — своя й з простору: тема могла
 * прийти звідки завгодно. Це два маленькі читання, і вони тут, а не в хабі:
 * сторінка лишається розміткою (`AGENTS.md` §3).
 *
 * Рішення «що це за вибір» ухвалює чиста функція (`describeTheme`) — її читає
 * тест, бо саме там ламається мовчки: назва може підмінитися «Своїми кольорами»
 * від однієї зміненої літери в порівнянні.
 *
 * @module web-platform-dev/src/pages/themes/useThemeLook
 */

import { COLOR_PRESETS, fontLabel, isCompleteColors, useStyleTheme } from "@wwwuabot/shared";
import { useAppliedScheme } from "./useAppliedScheme";
import { useMyThemes } from "./useMyThemes";
import { useSharedThemes } from "./useSharedThemes";
import { BRAND_LOOK, describeTheme, type NamedPalette } from "./theme-look";

/** Готові палітри у формі, яку розуміє `describeTheme`: рахується один раз. */
const PALETTES: readonly NamedPalette[] = COLOR_PRESETS.map(({ labelUk, bg, text, accent }) => ({
  label: labelUk,
  bg,
  text,
  accent,
}));

export interface ThemeLook {
  /** Характер продукту: «Apple» або «Material». */
  style: string;
  /** Яка тема діє; `null` — списки ще їдуть. */
  theme: string | null;
  /** Шрифт вибору — або «Як у стилі». */
  font: string;
  /** Три кольори, які стоять на екрані зараз. */
  colors: { bg?: string; text?: string; accent?: string };
  /** Вибір повний: лише тоді його показують зразками. */
  complete: boolean;
}

export function useThemeLook(): ThemeLook {
  const { brand, brands } = useStyleTheme();
  const { applied } = useAppliedScheme();
  const mine = useMyThemes();
  const shared = useSharedThemes();

  return {
    style: brands.find((definition) => definition.id === brand)?.labelUk ?? brand,
    theme: describeTheme(
      { colors: applied.colors, font: applied.font, complete: isCompleteColors(applied.colors) },
      {
        mine: mine.items,
        shared: shared.items,
        palettes: PALETTES,
        pending: mine.loading || shared.loading,
      },
    ),
    font: fontLabel(applied.font) ?? BRAND_LOOK,
    colors: applied.colors,
    complete: isCompleteColors(applied.colors),
  };
}
