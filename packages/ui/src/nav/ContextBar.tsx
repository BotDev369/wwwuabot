/**
 * `ContextBar` — контекстний футер: дії поточного екрана над головним.
 *
 * Смуга однакова, склад дій задає екран; головна дія — акцентна куля
 * останньою. Модалка накриває смугу: це дії екрана, а не хром
 * (`docs/PLATFORM.md`).
 * @module @wwwuabot/ui/nav
 */

import type { ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";

/** Одна дія екрана в контекстному футері. */
export interface ContextAction {
  /** Стабільний ключ React-списку. */
  key: string;
  /** Підпис дії; у головної він лишається тільки назвою для скрінрідера. */
  label: string;
  /** Знак із реєстру `@wwwuabot/shared`. */
  icon: IconName;
  /** Що зробити на дотик. */
  onSelect: () => void;
  /** Головна дія — акцентна куля; на смугу вона одна. */
  primary?: boolean;
  /** Стан-вибір: підсвічується, коли ввімкнений (і каже про це `aria-pressed`). */
  active?: boolean;
  /** Дія недоступна зараз, але з місця не зникає. */
  disabled?: boolean;
}

function ActionButton({ action }: { action: ContextAction }): ReactElement {
  const className = `wb-contextbar-btn${action.primary ? " wb-contextbar-btn--primary" : ""}`;
  return (
    <button
      type="button"
      className={className}
      // Підпис є тільки в другорядних: головну дію видно за кулею й знаком.
      aria-label={action.primary ? action.label : undefined}
      title={action.label}
      aria-pressed={action.active === undefined ? undefined : action.active}
      disabled={action.disabled}
      onClick={action.onSelect}
    >
      <Icon name={action.icon} size={action.primary ? 22 : 18} />
      {!action.primary && <span className="wb-contextbar-label">{action.label}</span>}
    </button>
  );
}

export function ContextBar({
  actions,
  label,
}: {
  actions: readonly ContextAction[];
  /** Назва смуги для скрінрідера: «Дії трекерів». */
  label: string;
}): ReactElement | null {
  // Порожній набір — немає смуги: екран без власних дій не має порожнього ряду
  // над футером (місце під нього тоді теж не лишається — `contextbar.css`).
  if (actions.length === 0) return null;

  return (
    <div className="wb-contextbar" role="toolbar" aria-label={label}>
      <div className="wb-contextbar-inner">
        {actions.map((action) => (
          <ActionButton key={action.key} action={action} />
        ))}
      </div>
    </div>
  );
}
