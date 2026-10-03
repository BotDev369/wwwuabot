/**
 * `useFontChoice` — поточний шрифт людини.
 *
 * Влаштований так само, як `useUserColors`, і це навмисно: шрифт — така сама
 * частина схеми, як три кольори, тож і поводитись він мусить однаково. Обраний
 * шрифт **одразу** на екрані й у пам'яті пристрою: кроку «Застосувати» немає,
 * тож і нічого забути.
 *
 * **Порожній вибір — не помилка, а «як у стилі».** Зняти шрифт — законне
 * рішення, і воно повертає брендову типографію (порожній id знімає інлайнові
 * змінні й прибирає ключ, див. `./font-dom`).
 *
 * @module packages/shared/src/components/theme/useFontChoice
 */

import { useCallback, useState } from "react";
import { applyFont, readStoredFont, saveStoredFont } from "../../styles/font-dom";

export interface UseFontChoiceResult {
  /** Поточний шрифт (`""` — «як у стилі»). */
  current: string;
  setFont: (id: string) => void;
}

export function useFontChoice(): UseFontChoiceResult {
  const [current, setCurrent] = useState<string>(readStoredFont);

  /** Обраний — одразу на екран і в пам'ять пристрою. */
  const setFont = useCallback((id: string) => {
    setCurrent(id);
    applyFont(id);
    saveStoredFont(id);
  }, []);

  return { current, setFont };
}
