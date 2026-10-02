/**
 * `useStyleTheme` — схема, яка живе на `<html>`.
 *
 * Тут лишається рівно те, що не є трьома кольорами користувача: **схема**
 * (`data-theme`, світла чи темна). Характер продукту вибором не є — він
 * константа (див. `./registry`), тож окремого стану для нього немає: значити
 * його в UI було б показувати людині вибір, якого вона не робить.
 * Колірну палітру задає людина трьома кольорами (`useUserColors`), і вона ж
 * визначає, світла тема чи темна на екрані.
 *
 * @module packages/shared/src/components/theme/useStyleTheme
 */

import { useCallback, useEffect, useState } from "react";
import { BRAND, type Scheme } from "../../styles/registry";

const THEME_KEY = "wwwuabot-theme";

function getStoredScheme(): Scheme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark") return raw;
    return "dark";
  } catch {
    return "dark";
  }
}

function applyScheme(scheme: Scheme) {
  document.documentElement.setAttribute("data-theme", scheme);
}

/** Схема + стиль продукту на атрибутах. «Системної» схеми немає. */
export function useStyleTheme() {
  const [scheme, setSchemeState] = useState<Scheme>(getStoredScheme);

  const setScheme = useCallback((next: Scheme) => {
    setSchemeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    applyScheme(next);
  }, []);

  const toggleScheme = useCallback(() => {
    setScheme(scheme === "dark" ? "light" : "dark");
  }, [scheme, setScheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-brand", BRAND);
    applyScheme(scheme);
  }, [scheme]);

  return { scheme, setScheme, toggleScheme };
}
