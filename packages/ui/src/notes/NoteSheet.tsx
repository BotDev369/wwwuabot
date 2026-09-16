/**
 * Перегляд нотатки — повноекранна поверхня з діями.
 *
 * Навіщо окремо від редактора: список обрізає текст, а читати нотатку треба
 * цілком — разом із хештегами, датою створення й датою зміни. Редактор
 * (композер) за це не відповідає: у ньому поле вводу, і текст там не
 * «показаний», а набраний.
 *
 * Дії стоять у тілі (`wb-sheet-actions`), як і в композері: модалка росте під
 * вміст, тож прибита смуга лише забирала б місце. Кого саме показати — знає
 * оболонка: вона відкриває цю поверхню.
 *
 * @module @wwwuabot/ui/notes
 */

import type { KeyboardEvent, ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { NoteRow } from "@wwwuabot/shared/notes";
import { formatNoteStamp } from "./format";

interface NoteSheetProps {
  note: NoteRow;
  onClose: () => void;
  onEdit: (note: NoteRow) => void;
  onDelete: (note: NoteRow) => void;
}

export function NoteSheet({ note, onClose, onEdit, onDelete }: NoteSheetProps): ReactElement {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }

  return (
    <div className="wb-modal-overlay wb-modal-overlay--tight" onClick={onClose}>
      <div
        className="wb-modal wb-modal--full wb-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Нотатка"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="wb-modal-header wb-sheet-head">
          <h2 className="wb-modal-title">Нотатка</h2>
          <button type="button" className="wb-close-btn" onClick={onClose} aria-label="Закрити">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="wb-modal-body wb-note-view">
          {note.text && <p className="wb-note-text">{note.text}</p>}

          {note.tags.length > 0 && (
            <div className="wb-note-tags">
              {note.tags.map((tag) => (
                <span key={tag} className="wb-chip wb-chip-sm">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Обидві дати — окремими рядками: «коли змінив» і «коли створив» —
              різні факти, і злитий рядок змушував би вгадувати, який із них. */}
          <dl className="wb-note-dates">
            <dt className="wb-text-muted">Змінено</dt>
            <dd>{formatNoteStamp(note.updated_at)}</dd>
            <dt className="wb-text-muted">Створено</dt>
            <dd>{formatNoteStamp(note.created_at)}</dd>
          </dl>

          <div className="wb-sheet-actions">
            <button
              type="button"
              className="wb-btn wb-btn-secondary wb-btn-danger"
              onClick={() => onDelete(note)}
            >
              <Icon name="trash" size={16} />
              Видалити
            </button>
            <button type="button" className="wb-btn wb-btn-primary" onClick={() => onEdit(note)}>
              <Icon name="edit" size={16} />
              Редагувати
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
