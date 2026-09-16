/**
 * Список нотаток — групи й картки.
 *
 * Картка — **кнопка на всю ширину**, а не текст із значком праворуч: палець
 * мусить діставати будь-де, а відкрити нотатку можна лише одним способом — на
 * неї натиснути. Текст у списку обрізається по висоті (повний — у перегляді),
 * бо список читають очима згори вниз, а не читають цілком.
 *
 * Розмітка — кирпичики `.wb-note*`: їх рендерить спільний код, тож стилі
 * живуть у `packages/shared/src/styles/` (правило 10).
 *
 * @module @wwwuabot/ui/notes
 */

import type { ReactElement } from "react";
import type { NoteRow } from "@wwwuabot/shared/notes";
import { formatNoteStamp } from "./format";
import type { NotesGroup } from "./types";

interface NotesListProps {
  groups: readonly NotesGroup[];
  /** Відкрити нотатку — перегляд із діями. */
  onOpen: (note: NoteRow) => void;
}

function NoteCard({
  note,
  onOpen,
}: {
  note: NoteRow;
  onOpen: (note: NoteRow) => void;
}): ReactElement {
  return (
    <li>
      <button type="button" className="wb-note-card" onClick={() => onOpen(note)}>
        {/* Порожній текст можливий: нотатка з самих хештегів — теж нотатка. */}
        {note.text && <span className="wb-note-card-text">{note.text}</span>}
        {note.tags.length > 0 && (
          <span className="wb-note-card-tags">
            {note.tags.map((tag) => (
              <span key={tag} className="wb-chip wb-chip-sm">
                #{tag}
              </span>
            ))}
          </span>
        )}
        <span className="wb-note-card-stamp wb-text-muted">{formatNoteStamp(note.updated_at)}</span>
      </button>
    </li>
  );
}

export function NotesList({ groups, onOpen }: NotesListProps): ReactElement {
  return (
    <>
      {groups.map((group) => (
        <section key={group.key} className="wb-note-group">
          <h2 className="wb-note-group-title">
            {group.label}
            {/* Кількість у заголовку групи — щоб «тут 12 нотаток» було видно,
                не рахуючи очима. */}
            <span className="wb-note-group-count">{group.notes.length}</span>
          </h2>
          <ul className="wb-note-list">
            {group.notes.map((note) => (
              <NoteCard key={note.id} note={note} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
