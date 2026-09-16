/**
 * «МоїНотатки» — екран, де видно те, що зберіг композер.
 *
 * Нотатки не мали екрана: композер їх зберігав, і після закриття модалки вони
 * зникали з очей. Це і є той екран — список своїх нотаток, найсвіжіші згори.
 *
 * Шлях власний (`/notes`), а не `slug` рядка `scenarios`: список складається з
 * даних людини (таблиця `notes`), а не з `page_data` (AGENTS.md §7). Тому ж
 * правилу підлягає й профіль.
 *
 * Розмітка — самі спільні кирпичики (`.wb-page*`, `.wb-card*`, `.wb-chip`,
 * `.wb-empty`): своїх класів тут рівно стільки, скільки треба для тексту
 * нотатки, — решта вже описана в дизайн-системі.
 *
 * @module web-platform-dev/src/pages/NotesPage
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { NoteRow } from "@wwwuabot/shared/notes";
import { useNotes } from "./useNotes";

/**
 * Дата нотатки у вигляді, зрозумілому людині: «16.09.2026, 14:08».
 *
 * Час у `notes` лежить як UTC без позначки зони (`YYYY-MM-DD HH:MM:SS` —
 * формат `formatSqliteDatetime`). Тому пробіл замінюємо на `T`, а `Z`
 * дописуємо: без цього рушій віддав би дату як локальну й показав би зсув на
 * кілька годин, а частина рушіїв — узагалі `Invalid Date`.
 */
function formatStamp(value: string): string {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NoteCard({ note }: { note: NoteRow }): ReactElement {
  return (
    <li className="wb-card">
      <div className="wb-card-body">
        {/* Порожній текст можливий: нотатка з самих хештегів — теж нотатка,
            і «порожній абзац» на її місці був би зайвою порожнечею. */}
        {note.text && <p className="note-text">{note.text}</p>}
        {note.tags.length > 0 && (
          <div className="note-tags">
            {note.tags.map((tag) => (
              <span key={tag} className="wb-chip wb-chip-sm">
                {/* `#` дописуємо при показі: у базі тег лежить без нього —
                    так його порівнює пошук (`tags.ts`). */}
                #{tag}
              </span>
            ))}
          </div>
        )}
        <p className="note-stamp wb-text-muted">{formatStamp(note.updated_at)}</p>
      </div>
    </li>
  );
}

export function NotesPage(): ReactElement {
  const { notes, loading, error } = useNotes();

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">МоїНотатки</h1>
      </div>

      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження нотаток…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{error}</p>
        </div>
      )}

      {!loading && !error && notes.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="text" size={32} />
          </span>
          <p className="wb-empty-text">Ще немає жодної нотатки.</p>
          {/* Кажемо, де саме створити: без цього порожній екран — це глухий
              кут, а кнопка «+» стоїть у футері під ним. */}
          <p className="wb-empty-text">
            Натисніть «+» у нижньому футері — нотатка з хештегами з'явиться тут.
          </p>
        </div>
      )}

      {!loading && !error && notes.length > 0 && (
        <ul className="note-list">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </ul>
      )}
    </div>
  );
}
