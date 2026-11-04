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
import { DataTable, type DataTableColumn } from "@wwwuabot/ui/table";
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

const COLUMNS: readonly DataTableColumn<AccessRequestItem>[] = [
  {
    key: "author",
    header: "Автор",
    width: 200,
    render: (item) => (
      <>
        <span className="wb-cell-title">{accessRequestAuthor(item)}</span>
        <span className="wb-badge wb-badge-neutral">{item.user_id}</span>
      </>
    ),
  },
  {
    key: "text",
    header: "Повідомлення",
    width: 320,
    render: (item) => preview(item.text),
  },
  {
    key: "when",
    header: "Коли",
    className: "wb-cell-nowrap",
    width: 140,
    render: (item) => <span title={whenTitle(item.created_at)}>{formatWhen(item.created_at)}</span>,
  },
];

export function RequestList({ items, emptyText, onOpen }: RequestListProps) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={items}
      rowKey={(item) => String(item.id)}
      onRowClick={(item) => onOpen(item.id)}
      empty={emptyText}
      minWidth={680}
    />
  );
}
