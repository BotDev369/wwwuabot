/**
 * Що **зараз** на екрані — щоб список схем міг сказати «застосовано».
 *
 * Порівнюємо не номер схеми, а сам вибір (три кольори + шрифт): людина може
 * зайти в «Налаштувати» й змінити колір — і тоді жодна схема більше не «діє»,
 * хоч номер останньої застосованої лишився б у пам'яті. Правило одне, і живе
 * воно у спільному модулі (`isThemeApplied`).
 *
 * @module web-platform-dev/src/pages/themes/useAppliedScheme
 */

import { useCallback, useState } from "react";
import { readStoredColors, readStoredFont, type UserColors } from "@wwwuabot/shared";
import { themeSchemeColors } from "@wwwuabot/shared/themes";
import { applyThemeScheme, type ApplicableScheme } from "@wwwuabot/shared/themes/apply";

export interface AppliedLook {
  colors: Partial<UserColors>;
  font: string;
}

export function useAppliedScheme() {
  const [applied, setApplied] = useState<AppliedLook>(() => ({
    colors: readStoredColors() ?? {},
    font: readStoredFont(),
  }));

  /**
   * Взяти схему собі: вибір іде в пам'ять пристрою й на екран (спільна
   * функція), а стан тут оновлюється тим самим значенням — без перечитування
   * сховища, бо в ньому зараз лежить рівно вона.
   */
  const apply = useCallback((scheme: ApplicableScheme) => {
    applyThemeScheme(scheme);
    setApplied({ colors: themeSchemeColors(scheme), font: scheme.font });
  }, []);

  return { applied, apply };
}
