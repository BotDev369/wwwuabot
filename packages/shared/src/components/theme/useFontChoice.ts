/**
 * `useFontChoice` — вибір шрифту: чернетка, збережене й правило «порожній — це
 * теж вибір».
 *
 * Влаштований так само, як `useUserColors`, і це навмисно: шрифт — така сама
 * частина схеми, як три кольори, тож і поводитись він мусить однаково. Людина
 * гортає список і **бачить** застосунок у вибраному шрифті, а «Зберегти» — це
 * лише запис у пам'ять пристрою.
 *
 * **Порожній вибір — не помилка, а «як у стилі».** Тому тут немає ні вимоги
 * «виберіть щось», ні стану «неповний»: зняти шрифт — законне рішення, і воно
 * повертає брендову типографіку.
 *
 * Вихід без збереження вертає **збережений** шрифт — із сховища, а не зі стану
 * (див. шапку `useUserColors`: «Зберегти і закрити» закриває поверхню тим самим
 * дотиком, тож розмонтування стається до перерендеру зі свіжим `saved`).
 *
 * @module packages/shared/src/components/theme/useFontChoice
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { applyFont, readStoredFont, saveStoredFont } from "../../styles/font-dom";

export interface UseFontChoiceResult {
  /** Те, що людина бачить у списку просто зараз (`""` — «як у стилі»). */
  draft: string;
  /** Те, що вже лежить у пам'яті пристрою. */
  saved: string;
  /** Чернетка відрізняється від збереженого. */
  dirty: boolean;
  setFont: (id: string) => void;
  save: () => void;
  reset: () => void;
}

export function useFontChoice(): UseFontChoiceResult {
  const [saved, setSaved] = useState<string>(readStoredFont);
  const [draft, setDraft] = useState<string>(readStoredFont);

  // Збережене для прибирання на виході: тому ефектові потрібне останнє
  // значення, а не те, що було на першому рендері.
  const savedRef = useRef(saved);
  savedRef.current = saved;

  // Живий перегляд: список мусить міняти екран, а не обіцяти.
  useEffect(() => {
    applyFont(draft);
  }, [draft]);

  // Вихід без збереження повертає збережений шрифт. Джерело — сховище.
  useEffect(() => () => applyFont(readStoredFont()), []);

  const setFont = useCallback((id: string) => setDraft(id), []);

  const save = useCallback(() => {
    saveStoredFont(draft);
    savedRef.current = draft;
    setSaved(draft);
  }, [draft]);

  const reset = useCallback(() => {
    saveStoredFont(null);
    savedRef.current = "";
    setSaved("");
    applyFont(null);
    setDraft("");
  }, []);

  return { draft, saved, dirty: draft !== saved, setFont, save, reset };
}
