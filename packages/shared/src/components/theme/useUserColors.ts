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
 * «вибрав» — різні речі, і друга не має ставатися випадково.
 *
 * @module packages/shared/src/components/theme/useUserColors
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColorPreset } from "../../styles/color-presets";
import {
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

export function useUserColors(): UseUserColorsResult {
  const [saved, setSaved] = useState<UserColors | null>(readStoredColors);
  const [draft, setDraft] = useState<ColorDraft>(() => readStoredColors() ?? {});

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

  // Вихід із панелі без «Зберегти» вертає збережену палітру.
  useEffect(() => () => applyColors(savedRef.current), []);

  const setSlot = useCallback((slot: ColorSlot, value: string) => {
    setDraft((current) => ({ ...current, [slot]: value }));
  }, []);

  const applyPreset = useCallback((preset: ColorPreset) => {
    setDraft({ bg: preset.bg, text: preset.text, accent: preset.accent });
  }, []);

  const save = useCallback(() => {
    if (!isCompleteColors(draft)) return;
    saveStoredColors(draft);
    setSaved(draft);
  }, [draft]);

  const reset = useCallback(() => {
    clearStoredColors();
    setSaved(null);
    setDraft({});
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
