/**
 * Рядок журналу: знак поверхні, назва сторінки-розділу, подробиці й час.
 *
 * Дієслів («відкрив», «натиснув», «закрив») тут немає: їх читали як шум, а
 * питання до журналу — «що це було» і «де». Поверхня каже знак із власним
 * тлом, тож підпис «Платформа» в рядку був би другим словом про те саме.
 *
 * @module web-admin-dev/src/pages/analytics/EventRows
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { formatPreciseStamp } from "@wwwuabot/shared/utils/datetime";
import { surfaceLabel, type UserEvent } from "@wwwuabot/shared/events";
import { eventRowOf, userLabel, userMeta } from "./analytics-view";

/** Знак поверхні: бот і застосунок мають різні знаки, не різні слова. */
function surfaceIcon(event: UserEvent): "bot" | "mobile" {
  return event.surface === "bot" ? "bot" : "mobile";
}

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
      {events.map((event) => {
        const row = eventRowOf(event);
        return (
          <li className="ana-event" key={event.id}>
            <span
              className={`ana-event-surface ana-event-surface--${event.surface}`}
              role="img"
              aria-label={surfaceLabel(event.surface)}
              title={surfaceLabel(event.surface)}
            >
              <Icon name={surfaceIcon(event)} size={16} />
            </span>

            <span className="ana-event-body">
              <span className="ana-event-title">{row.title}</span>
              {(row.details || showUser) && (
                <span className="ana-event-meta">
                  {showUser && (
                    <span className="ana-event-user" title={userMeta(event)}>
                      {userLabel(event)}
                    </span>
                  )}
                  {row.details && <span className="ana-event-details">{row.details}</span>}
                </span>
              )}
              {event.status === "error" && <span className="ana-event-error">помилка</span>}
            </span>

            <time className="ana-event-time" dateTime={event.createdAt}>
              {formatPreciseStamp(event.createdAt)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
