/**
 * «Що вибрано зараз» — одним словом, для пунктів хабу теми.
 *
 * **Назва теми, а не номер.** На пункті «Готові теми» людина бачить те, що діє
 * на екрані **просто зараз**: назву своєї теми, назву теми з простору, назву
 * готової палітри — або «Свої кольори», коли вибір нічому не відповідає.
 *
 * **Порівнюємо сам вибір, а не останній дотик.** Тому той, хто після
 * застосування змінив колір, більше не «в темі»: правило одне і живе воно у
 * спільному `isThemeApplied`, а не в пам'яті про номер.
 *
 * **Дані приходять аргументами, DOM тут немає.** Модуль імпортує лише чисту
 * половину shared (`@wwwuabot/shared/themes`), тож його читає тест, і він не
 * тягне за собою ні React, ні `localStorage`.
 *
 * @module web-platform-dev/src/pages/themes/theme-look
 */

import { isThemeApplied, type ThemeScheme } from "@wwwuabot/shared/themes";

/** Готова палітра як її бачить людина (структурно — `ColorPreset`). */
export interface NamedPalette {
  label: string;
  bg: string;
  text: string;
  accent: string;
}

/** Поточний вибір: три кольори (можуть бути неповні) і шрифт. */
export interface AppliedChoice {
  colors: { bg?: string; text?: string; accent?: string };
  font: string;
  /** Вибір повний. Інакше на екрані брендова палітра, а не вибір людини. */
  complete: boolean;
}

export interface LookSources {
  /** Свої теми: перевіряються першими — «моя» важливіша за однойменну готову. */
  mine: readonly ThemeScheme[];
  shared: readonly ThemeScheme[];
  palettes: readonly NamedPalette[];
  /** Списки ще їдуть: без них «Свої кольори» було б неправдою. */
  pending: boolean;
}

/** Вибір не збігається ні з однією темою — це теж стан, і він має назву. */
export const OWN_COLORS = "Свої кольори";
/** Нічого не вибрано: на екрані палітра й типографіка стилю. */
export const BRAND_LOOK = "Як у стилі";

/**
 * Що діє зараз. `null` — «ще не знаю» (списки своїх і чужих тем у дорозі), і це
 * чесніше за «Свої кольори»: показати неверний стан, а за секунду замінити його
 * правильним — це те саме, що смикнути екран.
 */
export function describeTheme(choice: AppliedChoice, sources: LookSources): string | null {
  if (!choice.complete) return BRAND_LOOK;

  const mine = sources.mine.find((theme) => isThemeApplied(theme, choice.colors, choice.font));
  if (mine) return `«${mine.name}»`;

  const shared = sources.shared.find((theme) => isThemeApplied(theme, choice.colors, choice.font));
  if (shared) return `«${shared.name}» · з простору`;

  if (sources.pending) return null;

  const palette = sources.palettes.find(
    (entry) =>
      entry.bg === choice.colors.bg &&
      entry.text === choice.colors.text &&
      entry.accent === choice.colors.accent,
  );
  return palette ? palette.label : OWN_COLORS;
}
