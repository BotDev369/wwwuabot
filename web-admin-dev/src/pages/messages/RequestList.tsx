/**
 * Список звернень — таблицею, як «Користувачі»: рядок відкривається на правці,
 * тож окрема колонка з кнопками в кожному рядку не потрібна.
 *
 * Показуємо лише початок тексту: повний — у модалці, а в таблиці він зробив би
 * три рядки на кожен запис і сховав би порядок часу.
 *
 * @module web-admin-dev/src/pages/messages/RequestList
 */

import type { AccessRequestItem } from "@wwwuabot/shared/access-requests";
import { accessRequestAuthor } from "@wwwuabot/shared/access-requests";
import { formatWhen, whenTitle } from "./formatWhen";

interface RequestListProps {
  items: readonly AccessRequestItem[];
  /** Підпис для колонки автора, коли людей у базі немає взагалі. */
  emptyText: string;
  onOpen: (id: number) => void;
}

/** Скільки знаків показати в рядку: решта — в модалці. */
const PREVIEW = 80;

function preview(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW ? `${flat.slice(0, PREVIEW)}…` : flat;
}

export function RequestList({ items, emptyText, onOpen }: RequestListProps) {
  return (
    <div className="wb-table-wrap">
      <table className="wb-table">
        <thead>
          <tr>
            <th>Автор</th>
            <th>Повідомлення</th>
            <th>Коли</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3}>
                <div className="wb-empty">
                  <p className="wb-empty-text">{emptyText}</p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} onClick={() => onOpen(item.id)} style={{ cursor: "pointer" }}>
                <td>
                  <div>{accessRequestAuthor(item)}</div>
                  <div className="wb-badge wb-badge-neutral">{item.user_id}</div>
                </td>
                <td>{preview(item.text)}</td>
                <td title={whenTitle(item.created_at)}>{formatWhen(item.created_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
