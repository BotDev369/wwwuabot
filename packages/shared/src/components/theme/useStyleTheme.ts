/**
 * `useStyleTheme` — схема, яка живе на `<html>`.
 *
 * Тут лишається рівно те, що не є трьома кольорами користувача: **схема**
 * (`data-theme`, світла чи темна). Стиль продукту вибором не є — він один і
 * живе в CSS, тож окремого стану для нього немає: значити його в UI було б
 * показувати людині вибір, якого вона не робить.
 * Колірну палітру задає людина трьома кольорами (`useUserColors`), і вона ж
 * визначає, світла тема чи темна на екрані.
 *
 * @module packages/shared/src/components/theme/useStyleTheme
 */

import { useCallback, useEffect, useState } from "react";
import { SCHEME_KEY, readStoredScheme, type Scheme } from "../../styles/registry";
import { COLORS_ATTR, COLORS_MODE_ATTR } from "../../styles/user-colors";

/**
 * Світлота, яку задає палітра людини, — або `null`, коли палітри немає.
 *
 * Поки три кольори стоять на `<html>`, `data-theme` до вигляду не має
 * голосу: світлоту виводить фон (`applyColors` ставить обидва атрибути разом).
 */
function paletteScheme(): Scheme | null {
  const root = document.documentElement;
  if (!root.hasAttribute(COLORS_ATTR)) return null;
  const mode = root.getAttribute(COLORS_MODE_ATTR);
  return mode === "light" || mode === "dark" ? mode : null;
}

function getStoredScheme(): Scheme {
  return paletteScheme() ?? readStoredScheme();
}

/** Схема не перебиває палітру: інакше перемикач на сторінці ламав би її мовчки. */
function applyScheme(scheme: Scheme) {
  if (paletteScheme()) return;
  document.documentElement.setAttribute("data-theme", scheme);
}

/** Схема на атрибуті `<html>`. «Системної» схеми немає. */
export function useStyleTheme() {
  const [scheme, setSchemeState] = useState<Scheme>(getStoredScheme);

  const setScheme = useCallback((next: Scheme) => {
    setSchemeState(next);
    try {
      localStorage.setItem(SCHEME_KEY, next);
    } catch {
      /* ignore */
    }
    applyScheme(next);
  }, []);

  const toggleScheme = useCallback(() => {
    setScheme(scheme === "dark" ? "light" : "dark");
  }, [scheme, setScheme]);

  useEffect(() => {
    applyScheme(scheme);
  }, [scheme]);

  return { scheme, setScheme, toggleScheme };
}
