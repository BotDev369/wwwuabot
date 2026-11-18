/**
 * `ThemeButton` — перемикач теми: світла / темна.
 *
 * **Не меню й не галерея.** Тем рівно дві, і вибір — це стан, а не колекція:
 * тому тут ковзний перемикач (`SwitchRow`, `role="switch"`) або одна кнопка в
 * згорнутому меню, а не поверхня з картками.
 *
 * Спільний для обох оболонок: адмінка ставить його в сайдбар, платформа — у
 * хедер (`AppBar` → `toggleScheme`).
 *
 * @module packages/shared/src/components/StyleToggle
 */

import type { ReactElement } from "react";
import { Icon } from "./Icon";
import { SwitchRow } from "./Switch";
import { useStyleTheme } from "./theme";

export { useStyleTheme } from "./theme";

export function ThemeButton({ compact = false }: { compact?: boolean }): ReactElement {
  const { scheme, setScheme } = useStyleTheme();
  const dark = scheme === "dark";
  const next = dark ? "light" : "dark";

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setScheme(next)}
        title={dark ? "Темна тема — увімкнути світлу" : "Світла тема — увімкнути темну"}
        aria-label={dark ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
        className="wb-nav-item"
      >
        <span className="wb-nav-icon">
          <Icon name={dark ? "moon" : "sun"} size={18} />
        </span>
      </button>
    );
  }

  return (
    <SwitchRow
      label="Тема"
      hint={dark ? "Темна" : "Світла"}
      checked={dark}
      onToggle={(on) => setScheme(on ? "dark" : "light")}
    />
  );
}

/* ─── Legacy exports (deprecated) ──────────────────────────────────────── */

/** @deprecated Use ThemeButton instead */
export function StylePicker(_props?: { compact?: boolean }) {
  return null;
}

/** @deprecated Use ThemeButton instead */
export function ThemeToggle(_props?: { compact?: boolean }) {
  return null;
}
