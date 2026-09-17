/**
 * `useUserColors` — стан трьох кольорів: чернетка, збережене й правило
 * «порожніх не буває».
 *
 * Чернетка **застосовується живцем**: людина рухає повзунок і бачить застосунок
 * у своїх кольорах, а не квадратик у модалці. Тому «Зберегти» — це лише запис у
 * локальну пам'ять, а не перше застосування.
 *
 * Поки вибір неповний (хоч один слот порожній), живцем іде **збережене**: інакше
 * панель на півслові залила б застосунок чужими кольорами. Звідси ж і правило
 * «зберегти можна лише коли всі три» — воно однакове для кнопки й для показу.
 *
 * Вихід із панелі без збереження вертає збережену палітру: «подивився» і
 * «вибрав» — різні речі, і друга не має ставатися випадково. Вертає саме **зі
 * сховища**, а не зі стану: «Зберегти і закрити» закриває панель тим самим
 * дотиком, тож розмонтування стається **до** перерендеру зі свіжим `saved` — і
 * знятий зі стану знімок повернув би на екран СТАРУ палітру (тема не
 * застосовувалась до перезавантаження сторінки). У сховищі ж запис уже лежить.
 *
 * Поки вибору немає зовсім, чернетка починається з **тих кольорів, які вже на
 * екрані** (`activeColorsFromDom`). Панель з трьома порожніми слотами — це
 * глухий кут: людина бачить не те, що має, а порожнечу.
 *
 * @module packages/shared/src/components/theme/useUserColors
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColorPreset } from "../../styles/color-presets";
import {
  activeColorsFromDom,
  applyColors,
  clearStoredColors,
  contrastWarning,
  isCompleteColors,
  isSameColors,
  missingLabels,
  readStoredColors,
  saveStoredColors,
  type ColorDraft,
  type ColorSlot,
  type UserColors,
} from "../../styles/user-colors";

export interface UseUserColorsResult {
  /** Те, що людина бачить у панелі просто зараз. */
  draft: ColorDraft;
  /** Те, що вже лежить у локальній пам'яті (`null` — вибору ще немає). */
  saved: UserColors | null;
  /** Усі три кольори задані — тільки тоді працює «Зберегти». */
  complete: boolean;
  /** Підписи порожніх слотів: панель каже ними, чого бракує. */
  missing: string[];
  /** Чернетка відрізняється від збереженого. */
  dirty: boolean;
  /** Попередження про нечитабельний вибір — або `null`. */
  warning: string | null;
  setSlot: (slot: ColorSlot, value: string) => void;
  applyPreset: (preset: ColorPreset) => void;
  save: () => void;
  reset: () => void;
}

/**
 * З чого панель починає: збережений вибір → кольори, які вже на екрані → нічого.
 * Спільне для відкриття й для «Скинути»: після скидання слоти показують
 * брендову палітру, а не порожнечу.
 */
function startDraft(): ColorDraft {
  return readStoredColors() ?? activeColorsFromDom() ?? {};
}

export function useUserColors(): UseUserColorsResult {
  const [saved, setSaved] = useState<UserColors | null>(readStoredColors);
  const [draft, setDraft] = useState<ColorDraft>(startDraft);

  // Збережене для прибирання на виході: тому ефектові потрібне останнє
  // значення, а не те, що було на першому рендері.
  const savedRef = useRef(saved);
  savedRef.current = saved;

  const complete = isCompleteColors(draft);
  const missing = useMemo(() => missingLabels(draft), [draft]);
  const dirty = !isSameColors(draft, saved ?? {});
  const warning = complete ? contrastWarning(draft) : null;

  // Живий перегляд: неповний вибір не застосовується ніколи.
  useEffect(() => {
    applyColors(isCompleteColors(draft) ? draft : savedRef.current);
  }, [draft]);

  // Вихід із панелі без «Зберегти» вертає збережену палітру. Джерело —
  // сховище: при «Зберегти і закрити» панель зникає тим самим дотиком, і
  // стан `saved` ще не встигає доїхати до рендера (див. шапку файлу).
  useEffect(() => () => applyColors(readStoredColors()), []);

  const setSlot = useCallback((slot: ColorSlot, value: string) => {
    setDraft((current) => ({ ...current, [slot]: value }));
  }, []);

  const applyPreset = useCallback((preset: ColorPreset) => {
    setDraft({ bg: preset.bg, text: preset.text, accent: preset.accent });
  }, []);

  const save = useCallback(() => {
    if (!isCompleteColors(draft)) return;
    saveStoredColors(draft);
    // Знімок для живого перегляду оновлюємо тут же: якщо панель закриють цим
    // самим дотиком, старий знімок уже не має жодного права вертатись на екран.
    savedRef.current = draft;
    setSaved(draft);
  }, [draft]);

  const reset = useCallback(() => {
    clearStoredColors();
    savedRef.current = null;
    setSaved(null);
    // Скидання повертає брендову палітру — тож її й показуємо в слотах, а не
    // три порожні квадрати (саме через них панель виглядала як «усе по нулях»).
    applyColors(null);
    setDraft(startDraft());
  }, []);

  return {
    draft,
    saved,
    complete,
    missing,
    dirty,
    warning,
    setSlot,
    applyPreset,
    save,
    reset,
  };
}
