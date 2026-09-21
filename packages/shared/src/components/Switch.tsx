import type { ReactElement } from "react";

/**
 * Перемикач «увімкнено / вимкнено» з підписом — спільний кирпичик.
 *
 * **Чому не `checkbox`.** У Mini App дотик пальцем — єдиний спосіб щось
 * увімкнути, а квадратик із галочкою на телефоні читається як «вибрати один із
 * багатьох». Ковзний перемикач каже саме те, що тут відбувається: стан триває
 * (профіль **публічний**), поки його не вимкнуть.
 *
 * **Роль, а не вигляд.** `role="switch"` і `aria-checked` ставить сам кирпичик:
 * інакше кожен наступний перемикач забув би сказати, у якому він стані, і для
 * читача з екрана це була б безадресна кнопка.
 *
 * @module @wwwuabot/shared/components/Switch
 */
export function SwitchRow({
  label,
  hint,
  checked,
  disabled = false,
  onToggle,
}: {
  label: string;
  /** Другий рядок під підписом — лише тоді, коли без нього незрозуміло. */
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}): ReactElement {
  return (
    <div className="wb-switch-row">
      <div className="wb-switch-text">
        <span className="wb-switch-label">{label}</span>
        {hint && <span className="wb-switch-hint">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`wb-switch${checked ? " wb-switch--on" : ""}`}
        disabled={disabled}
        onClick={() => onToggle(!checked)}
      >
        <span className="wb-switch-knob" />
      </button>
    </div>
  );
}
