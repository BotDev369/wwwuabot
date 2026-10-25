/**
 * Порожній список «Моїх» — два різні випадки: трекерів ще немає взагалі або
 * жоден не має вибраного пріоритету. Текст каже, що сталося, і веде далі —
 * «До шаблонів» або зняти фільтр.
 *
 * @module web-platform-dev/src/pages/trackers/TrackersEmptyState
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";

export function TrackersEmptyState({
  filtered,
  onTemplates,
  onClearFilter,
}: {
  /** Фільтр пріоритету ввімкнений — порожньо не через відсутність трекерів. */
  filtered: boolean;
  onTemplates: () => void;
  onClearFilter: () => void;
}): ReactElement {
  return (
    <div className="wb-empty">
      <span className="wb-empty-icon">
        <Icon name="bar-chart" size={32} />
      </span>
      <p className="wb-empty-text">
        {filtered ? "Немає трекерів із цим пріоритетом." : "Трекерів ще немає."}
      </p>
      {filtered ? (
        <button type="button" className="wb-btn wb-btn-secondary" onClick={onClearFilter}>
          Показати всі
        </button>
      ) : (
        <>
          <p className="wb-text-muted">
            Візьміть готову мірку з «Шаблонів» або створіть свою — у «Моїх» лишається тільки те, що
            ви обрали.
          </p>
          <button type="button" className="wb-btn wb-btn-primary" onClick={onTemplates}>
            До шаблонів
          </button>
        </>
      )}
    </div>
  );
}
