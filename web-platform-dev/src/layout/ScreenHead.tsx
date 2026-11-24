/**
 * Верхівка екрана: назва й підпис на кольорі шапки — одна на всі екрани.
 * Сторінки не малюють власних заголовків (docs/PLATFORM.md).
 *
 * @module web-platform-dev/src/layout/ScreenHead
 */

import type { ReactElement } from "react";

export interface ScreenHeadProps {
  /** Назва екрана з реєстру (або уточнена сторінкою: трекер, товар). */
  title: string | null;
  /** Один короткий рядок під назвою; `null` — лишається тільки назва. */
  lead: string | null;
}

/**
 * Заголовок сторінки. Порожня назва — не малюємо нічого: порожня смуга
 * виглядала б як помилка завантаження.
 */
export function ScreenHead({ title, lead }: ScreenHeadProps): ReactElement | null {
  if (!title) return null;

  return (
    <header className="wb-screen-head">
      <h1 className="wb-screen-head__title">{title}</h1>
      {lead && <p className="wb-screen-head__lead">{lead}</p>}
    </header>
  );
}
