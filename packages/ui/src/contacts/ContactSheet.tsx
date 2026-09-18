/**
 * Картка контакту — повноекранна поверхня з усіма полями.
 *
 * Дотик по контакту в списку відкриває саме її, і це навмисно **та сама
 * поверхня**, що меню профілю й композер (`MenuModal` → `.wb-sheet`): третій
 * вид модалки означав би треті правила прокрутки, шапки й закриття.
 *
 * **Тут живуть усі поля контакту** — і саме тому список їх не показує: поле в
 * двох місцях неминуче редагується в одному й читається в другому. Форма одна
 * на створення й правку (`ContactInput`), бо картка змінює все одразу.
 *
 * **Лінк — поле, а не дія списку.** Поки код не складено, тут стоїть кнопка
 * «Створити лінк»; коли код є — сам лінк і «Копіювати». А **приєднаному**
 * контакту лінк не пропонується: закріплення стається раз, і посилання, яке
 * вже нікого не закріпить, було б обіцянкою, якої воно не виконає (те саме
 * правило стоїть на сервері).
 *
 * Дії картка **не робить сама**: збереження, видалення, буфер обміну й
 * підтвердження — справа оболонки (та сама межа, що в нотатках).
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
  sanitizeTelegramId,
  type Contact,
  type ContactInput,
} from "@wwwuabot/shared/contacts";
import { addTags, removeTag } from "@wwwuabot/shared/tags";
import { formatStamp } from "@wwwuabot/shared/utils/datetime";
import { ComposerTags } from "../composer/ComposerTags";
import { MenuModal } from "../menu";

interface ContactSheetProps {
  contact: Contact;
  /** Порядковий номер у списку — той самий, що видно в рядку. */
  index: number;
  /** Чи вважати лінк скопійованим: стан веде оболонка (вона ж кличе буфер). */
  copied: boolean;
  onSave: (input: ContactInput) => void;
  onDelete: () => void;
  /** Скласти або перескласти особистий лінк. */
  onMakeLink: () => void;
  onCopyLink: () => void;
  onClose: () => void;
}

const NAME_ID = "wb-contact-name-input";
const USERNAME_ID = "wb-contact-username-input";
const TELEGRAM_ID = "wb-contact-telegram-input";
const NOTES_ID = "wb-contact-notes-input";

export function ContactSheet({
  contact,
  index,
  copied,
  onSave,
  onDelete,
  onMakeLink,
  onCopyLink,
  onClose,
}: ContactSheetProps): ReactElement {
  const [name, setName] = useState(contact.name);
  const [username, setUsername] = useState(contact.username ?? "");
  const [telegramId, setTelegramId] = useState(
    contact.telegramUserId === null ? "" : String(contact.telegramUserId),
  );
  const [tags, setTags] = useState<readonly string[]>(contact.tags);
  const [notes, setNotes] = useState(contact.notes);

  // Порожнє ім'я не зберігаємо: без нього список стає стовпчиком однакових
  // карток, а сервер однаково відповість 400.
  const canSave = sanitizeContactName(name) !== "";
  const joined = contact.telegramUserId !== null;

  function save(): void {
    if (!canSave) return;
    onSave({
      name: sanitizeContactName(name),
      username: sanitizeContactUsername(username),
      telegramUserId: sanitizeTelegramId(telegramId),
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
          <p className="wb-contact-meta">
            № {index + 1} · створено {formatStamp(contact.createdAt)}
            {contact.updatedAt && contact.updatedAt !== contact.createdAt
              ? ` · змінено ${formatStamp(contact.updatedAt)}`
              : ""}
          </p>

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
            <label className="wb-label" htmlFor={TELEGRAM_ID}>
              Telegram ID
            </label>
            <input
              id={TELEGRAM_ID}
              className="wb-input"
              value={telegramId}
              inputMode="numeric"
              placeholder="6281898553"
              onChange={(event) => setTelegramId(event.target.value)}
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

          <div className="wb-field">
            <span className="wb-label">Особистий лінк</span>
            {joined ? (
              <p className="wb-contact-joined">
                <Icon name="check" size={14} />
                {contact.joinedAt ? `Приєднався ${formatStamp(contact.joinedAt)}` : "Приєднався"}
              </p>
            ) : contact.code ? (
              <div className="wb-contact-link-row">
                <code className="wb-contact-link">
                  {contact.deepLink ?? `${contact.code} — лінк не скласти: невідоме ім'я бота`}
                </code>
                <button
                  type="button"
                  className="wb-btn wb-btn-secondary"
                  onClick={onCopyLink}
                  disabled={!contact.deepLink}
                >
                  <Icon name={copied ? "check" : "copy"} size={16} />
                  {copied ? "Скопійовано" : "Копіювати"}
                </button>
              </div>
            ) : (
              <button type="button" className="wb-btn wb-btn-secondary" onClick={onMakeLink}>
                <Icon name="link" size={16} />
                Створити лінк
              </button>
            )}
          </div>

          <div className="wb-sheet-actions">
            <button
              type="button"
              className="wb-btn wb-btn-secondary wb-btn-danger"
              onClick={onDelete}
            >
              <Icon name="trash" size={16} />
              Прибрати
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
