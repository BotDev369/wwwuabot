/**
 * `useUserColors` — поточні три кольори людини.
 *
 * **Вибір і є тема.** Натиснули палітру чи схему — вона вже на екрані **і** в
 * пам'яті пристрою: окремого кроку «Застосувати» немає, тож і нічого забути.
 * Чернетка з «Застосувати» була роздвоєнням одного вибору на два кроки, і воно
 * давало рівно те, що бачив власник: панель закривали — вибір зникав.
 *
 * **Неповна палітра ніде не записується.** Поки бракує хоч одного кольору, на
 * екрані лишається те, що вже застосовано, а панель **називає** порожні слоти:
 * «порожніх не буває» — це функція (`isCompleteColors`), а не намір.
 *
 * Поки вибору немає зовсім, панель починається з **тих кольорів, які вже на
 * екрані** (`activeColorsFromDom`): три порожні слоти — це глухий кут, людина
 * бачить не те, що має, а порожнечу.
 *
 * @module packages/shared/src/components/theme/useUserColors
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { ColorPreset } from "../../styles/color-presets";
import {
  activeColorsFromDom,
  applyColors,
  contrastWarning,
  isCompleteColors,
  missingLabels,
  readStoredColors,
  saveStoredColors,
  type ColorDraft,
  type ColorSlot,
} from "../../styles/user-colors";

export interface UseUserColorsResult {
  /** Поточні кольори: те, що людина бачить просто зараз. */
  current: ColorDraft;
  /** Усі три кольори задані — тільки тоді вибір записується. */
  complete: boolean;
  /** Підписи порожніх слотів: панель каже ними, чого бракує. */
  missing: string[];
  /** Попередження про нечитабельний вибір — або `null`. */
  warning: string | null;
  setSlot: (slot: ColorSlot, value: string) => void;
  /** Уся трійка одразу — «взяти тему собі»: один дотик, а не три рядки. */
  setColors: (next: ColorDraft) => void;
  applyPreset: (preset: ColorPreset) => void;
}

/** З чого панель починає: збережений вибір → кольори, які вже на екрані → нічого. */
function startDraft(): ColorDraft {
  return readStoredColors() ?? activeColorsFromDom() ?? {};
}

export function useUserColors(): UseUserColorsResult {
  const [current, setCurrent] = useState<ColorDraft>(startDraft);

  // Останнє значення — для сусіднього `setSlot`, який має оновити один слот у
  // наявній трійці, не читаючи її зі стану (тут він уже застарілий).
  const currentRef = useRef(current);
  currentRef.current = current;

  const complete = isCompleteColors(current);
  const missing = useMemo(() => missingLabels(current), [current]);
  const warning = complete ? contrastWarning(current) : null;

  /** Обране — одразу на екран і в пам'ять пристрою. */
  const commit = useCallback((next: ColorDraft) => {
    currentRef.current = next;
    setCurrent(next);
    if (!isCompleteColors(next)) return;
    applyColors(next);
    saveStoredColors(next);
  }, []);

  const setSlot = useCallback(
    (slot: ColorSlot, value: string) => commit({ ...currentRef.current, [slot]: value }),
    [commit],
  );

  const setColors = useCallback((next: ColorDraft) => commit(next), [commit]);

  const applyPreset = useCallback(
    (preset: ColorPreset) => commit({ bg: preset.bg, text: preset.text, accent: preset.accent }),
    [commit],
  );

  return { current, complete, missing, warning, setSlot, setColors, applyPreset };
}
