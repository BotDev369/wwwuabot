/**
 * Список подій: час, людина, поверхня, дія.
 *
 * Найновіші першими: журнал читають, щоб зрозуміти «що сталося щойно».
 * Метод — окремий бейдж, бо око шукає що зробили, а не як читали.
 *
 * @module web-admin-dev/src/pages/analytics/EventRows
 */

import type { ReactElement } from "react";
import { formatStamp } from "@wwwuabot/shared/utils/datetime";
import { eventKindLabel, surfaceLabel, type UserEvent } from "@wwwuabot/shared/events";
import { actionMethod, actionText, surfaceClass, userLabel, userMeta } from "./analytics-view";

export function EventRows({
  events,
  showUser = true,
}: {
  events: readonly UserEvent[];
  showUser?: boolean;
}): ReactElement {
  if (events.length === 0) {
    return <p className="ana-empty">Подій за цей час немає</p>;
  }

  return (
    <ul className="ana-events">
      {events.map((event) => (
        <li className="ana-event" key={event.id}>
          <span className="ana-event-time">{formatStamp(event.createdAt)}</span>
          <span className="ana-event-body">
            <span className="ana-event-head">
              <span className={surfaceClass(event.surface)}>{surfaceLabel(event.surface)}</span>
              <span className="ana-method">{actionMethod(event.action)}</span>
              <span className="ana-event-kind">{eventKindLabel(event.kind)}</span>
              {showUser && (
                <span className="ana-event-user" title={userMeta(event)}>
                  {userLabel(event)}
                </span>
              )}
            </span>
            <span className="ana-event-action">{actionText(event.action)}</span>
            {event.details && <span className="ana-event-details">{event.details}</span>}
            {event.status === "error" && <span className="ana-event-error">помилка</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
