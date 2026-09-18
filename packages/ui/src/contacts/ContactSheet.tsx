/**
 * Форма контакту — повноекранна поверхня з **власними** полями.
 *
 * Відкривається з розкритого рядка кнопкою «Змінити», і це навмисно **та сама
 * поверхня**, що меню профілю й композер (`MenuModal` → `.wb-sheet`): третій вид
 * модалки означав би треті правила прокрутки, шапки й закриття.
 *
 * **Тут лише те, що пише власник** — ім'я, `@username`, хештеги, примітки — бо
 * саме тому рядок списку їх не показує: поле в двох місцях неминуче редагується
 * в одному й читається в другому. Форма одна на створення й правку
 * (`ContactInput`), бо картка змінює все одразу.
 *
 * **Чого тут немає — і чому.** Немає ні етапів приєднання, ні лінка, ні дат, ні
 * кнопки «Прибрати»: це **факти**, а не поля, і показує їх тіло рядка — там, де
 * контакт читають. Форма, яка показує ті самі факти вдруге, змушувала б тримати
 * їх узгодженими в двох місцях (та сама межа, що в нотатках: редактор редагує,
 * картка показує). І немає поля Telegram-id: власник його не знає — його бачить
 * бот, коли людина приходить за лінком, і саме тому вписане руками число робило
 * б контакт «приєднаним», а лінк — «використаним» (AGENTS.md §7).
 *
 * Збереження форма **не робить сама**: це справа оболонки — вона ж веде стан і
 * показує помилку.
 *
 * @module @wwwuabot/ui/contacts
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  MAX_CONTACT_NAME,
  MAX_CONTACT_NOTES,
  sanitizeContactName,
  sanitizeContactNotes,
  sanitizeContactUsername,
  type Contact,
  type ContactInput,
} from "@wwwuabot/shared/contacts";
import { addTags, removeTag } from "@wwwuabot/shared/tags";
import { ComposerTags } from "../composer/ComposerTags";
import { MenuModal } from "../menu";

interface ContactSheetProps {
  contact: Contact;
  onSave: (input: ContactInput) => void;
  onClose: () => void;
}

const NAME_ID = "wb-contact-name-input";
const USERNAME_ID = "wb-contact-username-input";
const NOTES_ID = "wb-contact-notes-input";

export function ContactSheet({ contact, onSave, onClose }: ContactSheetProps): ReactElement {
  const [name, setName] = useState(contact.name);
  const [username, setUsername] = useState(contact.username ?? "");
  const [tags, setTags] = useState<readonly string[]>(contact.tags);
  const [notes, setNotes] = useState(contact.notes);

  // Порожнє ім'я не зберігаємо: без нього список стає стовпчиком однакових
  // карток, а сервер однаково відповість 400.
  const canSave = sanitizeContactName(name) !== "";

  function save(): void {
    if (!canSave) return;
    onSave({
      name: sanitizeContactName(name),
      username: sanitizeContactUsername(username),
      tags: [...tags],
      notes: sanitizeContactNotes(notes),
    });
  }

  return (
    <MenuModal
      title="Контакт"
      onClose={onClose}
      content={
        <div className="wb-contact-sheet">
          <div className="wb-field">
            <label className="wb-label" htmlFor={NAME_ID}>
              Ім&apos;я
            </label>
            <input
              id={NAME_ID}
              className="wb-input"
              value={name}
              maxLength={MAX_CONTACT_NAME}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="wb-field">
            <label className="wb-label" htmlFor={USERNAME_ID}>
              @username
            </label>
            <input
              id={USERNAME_ID}
              className="wb-input"
              value={username}
              placeholder="без @, як у Telegram"
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="wb-field">
            {/* Підпис без `htmlFor`: поле хештегів має власний `id` (спільний із
                композером), і другий `for` на той самий ідентифікатор дублював
                би зв'язок. */}
            <span className="wb-label">Хештеги</span>
            <ComposerTags
              tags={tags}
              onAdd={(raw) => setTags((prev) => addTags(prev, raw))}
              onRemove={(tag) => setTags((prev) => removeTag(prev, tag))}
            />
          </div>

          <div className="wb-field">
            <label className="wb-label" htmlFor={NOTES_ID}>
              Примітки
            </label>
            <textarea
              id={NOTES_ID}
              className="wb-textarea"
              value={notes}
              maxLength={MAX_CONTACT_NOTES}
              placeholder="Усе, що варто пам'ятати про людину"
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="wb-sheet-actions">
            <button type="button" className="wb-btn wb-btn-secondary" onClick={onClose}>
              <Icon name="close" size={16} />
              Скасувати
            </button>
            <button
              type="button"
              className="wb-btn wb-btn-primary"
              onClick={save}
              disabled={!canSave}
            >
              <Icon name="save" size={16} />
              Зберегти
            </button>
          </div>
        </div>
      }
    />
  );
}
