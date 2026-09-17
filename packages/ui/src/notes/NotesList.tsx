/**
 * Список нотаток — групи й картки-акордеони.
 *
 * Картка показує **два рядки** й більше нічого: початок тексту з датою-часом і
 * хештеги. Усе інше — у розкритому тілі, і **закрита** кожна картка, бо список
 * читають очима згори вниз: розгорнуті тексти перетворюють його на полотно, де
 * не видно, скільки нотаток узагалі є (та сама причина, що й у акордеонів
 * панелі «Тема»).
 *
 * Що де стоїть — навмисно: **текст** це те, за чим нотатку впізнають, тож він
 * один у рядку з датою й дістає весь вільний простір, а **дата й хештеги**
 * стоять приглушено: менший кегль і не основний колір. Коли вони такі ж
 * голосні, як текст, список читається як суцільна сітка підписів, і око не
 * чіпляється ні за що. Приглушено — але **не найдрібніше**: хештег — `--text-sm`
 * і `--text-secondary`, бо 12px і `--text-muted` на телефоні не читались
 * узагалі. Хештег тому — ще й **не чип** (`.wb-note-tag`, а не `.wb-chip`): у
 * чипа бренди задають свої мірки з `!important`, і рядок хештегів виходив
 * удвічі вищим за рядок із текстом.
 *
 * А **знайдений** хештег (який знайшов пошук або фільтр — `foundTags`) стоїть
 * акцентним кольором: у стовпчику однакових підписів око не бачить, за що
 * зачепився пошук. Знайдені теги рахує оболонка одним чистим викликом, а
 * список лише малює — правил пошуку в розмітці немає.
 *
 * Голова картки — **кнопка на всю ширину** (палець мусить діставати будь-де),
 * а тіло з'являється під нею вже зі своїми кнопками: тіло вкладене в кнопку
 * дало б кнопки в кнопці, чого розмітка не дозволяє.
 *
 * Розмітка — кирпичики `.wb-note*`: їх рендерить спільний код, тож стилі
 * живуть у `packages/shared/src/styles/` (правило 10).
 *
 * @module @wwwuabot/ui/notes
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { NoteRow } from "@wwwuabot/shared/notes";
import { formatNoteStamp } from "./format";
import type { NotesGroup } from "./types";

interface NotesListProps {
  groups: readonly NotesGroup[];
  /**
   * Хештеги, які знайшов поточний пошук чи фільтр (`foundTags`) — картка
   * виділяє їх акцентом. Порожній список — не помилка, а «нічого не шукали».
   */
  found?: readonly string[];
  /** Відкрити редактор — композер із цією нотаткою. */
  onEdit: (note: NoteRow) => void;
  /** Прибрати нотатку — оболонка питає підтвердження сама. */
  onDelete: (note: NoteRow) => void;
}

/**
 * Початок тексту одним рядком: переноси згортаються в пробіли, бо рядок у
 * картці **один** — інакше «початок» з'їдав би пів екрана, і саме те, від чого
 * ми тікали, повернулося б.
 */
function previewLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function NoteCard({
  note,
  found,
  onEdit,
  onDelete,
}: {
  note: NoteRow;
  found: ReadonlySet<string>;
  onEdit: (note: NoteRow) => void;
  onDelete: (note: NoteRow) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const line = previewLine(note.text);

  return (
    <li className={`wb-note-item${open ? " wb-note-item--open" : ""}`}>
      {/* Рядок 1 — початок тексту (він і забирає вільне місце) і дата з часом;
          рядок 2 — хештеги. Обидва видно й у закритій картці: саме за ними
          люди й вибирають, що відкрити. */}
      <button
        type="button"
        className="wb-note-card"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="wb-note-card-line">
          {/* Порожній текст можливий: нотатка з самих хештегів — теж нотатка. */}
          <span className={`wb-note-card-text${line ? "" : " wb-text-muted"}`}>
            {line || "Без тексту"}
          </span>
          <span className="wb-note-card-stamp">{formatNoteStamp(note.updated_at)}</span>
          <span className="wb-note-card-caret">
            <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
          </span>
        </span>

        {note.tags.length > 0 && (
          <span className="wb-note-card-tags">
            {/* Хештег тут — **підпис**, а не чип: власний кирпичик, бо `.wb-chip`
                бренди роздувають своїми мірками з `!important`, і хештеги
                розповзались на пів екрана. */}
            {note.tags.map((tag) => (
              <span key={tag} className={`wb-note-tag${found.has(tag) ? " wb-note-tag--hit" : ""}`}>
                #{tag}
              </span>
            ))}
          </span>
        )}
      </button>

      {open && (
        <div className="wb-note-card-body">
          {note.text.trim() && <p className="wb-note-text">{note.text}</p>}

          {/* Обидві дати — парами «підпис → значення»: «коли змінив» і «коли
              створив» — різні факти, і злитий рядок змушував би вгадувати,
              який із них. У рядку картки стоїть лише зміна. */}
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
      )}
    </li>
  );
}

export function NotesList({ groups, found, onEdit, onDelete }: NotesListProps): ReactElement {
  // Знімок для швидкого пошуку — той самий на весь список: хештег у базі один
  // на всі нотатки, тож «знайдений» він скрізь однаково.
  const hits = new Set(found ?? []);

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
              <NoteCard
                key={note.id}
                note={note}
                found={hits}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
