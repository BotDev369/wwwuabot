/**
 * Стан екрана своєї сторінки: чекають на неї, або її немає.
 *
 * Перегляд і редактор читають **один рядок**, тож і чекають на нього однаково:
 * інакше один показував би скелет, а другий — тишу, і це виглядало б як різні
 * помилки там, де одна причина.
 *
 * Замок на місці сторінки — не випадкова іконка: «такої сторінки немає» буває
 * і тоді, коли номер узяли з чужої адреси або він лишився від видаленої
 * сторінки, а чуже тут справді закрите.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";

export function PageState({
  loading,
  message,
}: {
  loading: boolean;
  /** Що сказати, коли сторінки немає: причину знає той, хто кличе. */
  message: string;
}): ReactElement {
  if (loading) {
    return (
      <div className="wb-empty">
        <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
        <p className="wb-text-muted">Завантаження…</p>
      </div>
    );
  }

  return (
    <div className="wb-empty">
      <span className="wb-empty-icon">
        <Icon name="lock" size={32} />
      </span>
      <p className="wb-empty-text">{message}</p>
    </div>
  );
}
