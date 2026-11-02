/**
 * `useStyleTheme` — тема, яка живе на `<html>`.
 *
 * **Стан — ідентифікатор теми з реєстру**, а не «світла / темна»: тем шість, і
 * кожна має власний характер. Світлота — властивість теми (`color-scheme`), а
 * не другий перемикач.
 *
 * **Вибір застосовується одразу.** `applyTheme()` ставить атрибут, шрифт
 * заголовків і пише вибір у памʼять пристрою — окремого кроку «Зберегти»
 * немає, тож і забути його неможливо.
 *
 * @module packages/shared/src/components/theme/useStyleTheme
 */

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_THEME, type Scheme } from "../../styles/registry";
import { applyTheme, readStoredTheme } from "../../styles/theme-dom";

/** Перемикач «день / ніч» для блоків сторінки: дві крайні теми реєстру. */
const LIGHT_THEME: Scheme = "light";
const DARK_THEME: Scheme = "dark";

export function useStyleTheme() {
  const [scheme, setSchemeState] = useState<Scheme>(readStoredTheme);

  const setScheme = useCallback((next: Scheme) => {
    setSchemeState(next);
    applyTheme(next);
  }, []);

  const toggleScheme = useCallback(() => {
    setScheme(scheme === DARK_THEME ? LIGHT_THEME : DARK_THEME);
  }, [scheme, setScheme]);

  // Перший рендер міг прийти з атрибутом, який поставив `initTheme()` до
  // монтування: застосовуємо ще раз, щоб шрифт теми не лишився від попередньої.
  useEffect(() => {
    applyTheme(scheme);
  }, [scheme]);

  return { scheme: scheme ?? DEFAULT_THEME, setScheme, toggleScheme };
}
