/**
 * Картка контакту — повноекранна поверхня з усіма полями.
 *
 * Дотик по контакту в списку відкриває саме її, і це навмисно **та сама
 * поверхня**, що меню профілю й композер (`MenuModal` → `.wb-sheet`): третій
 * вид модалки означав би треті правила прокрутки, шапки й закриття.
 *
 * **Тут живуть лише власні поля** — ім'я, `@username`, хештеги, примітки, — бо
 * саме тому список їх не показує: поле в двох місцях неминуче редагується в
 * одному й читається в другому. Форма одна на створення й правку
 * (`ContactInput`), бо картка змінює все одразу.
 *
 * **Чого тут немає — Telegram-id людини.** Власник його не знає: id бачить
 * бот, коли людина приходить за лінком, і саме тому поле не можна вписати
 * руками (вгадане число зробило б контакт «приєднаним», а лінк —
 * «використаним»). Замість поля — **етапи приєднання**: запрошено → зайшов у
 * бота → зайшов на платформу, з датами й з id того, хто прийшов.
 *
 * **Приєднання — це два кроки, і другий не за горою.** Людина може зайти в
 * бота й не відкрити Mini App: тоді контакт приєднався **частково**, лінк уже
 * використано (він персональний), і кнопки «Копіювати» тут немає — замість неї
 * стоїть стан. Повну дату ставить `api-dev`, коли людина заходить на
 * платформу, і картка лише показує її.
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
const NOTES_ID = "wb-contact-notes-input";

/** Один етап приєднання: що сталося, коли і з чим. */
function StageRow({
  done,
  label,
  value,
  note,
}: {
  done: boolean;
  label: string;
  value: string;
  note?: string;
}): ReactElement {
  return (
    <li className={`wb-contact-stage${done ? " wb-contact-stage--done" : ""}`}>
      {/* Знак каже стан **разом** із словом: галочка для пройденого кроку,
          риска — для того, що ще ні. Порожня крапка читалась би як завантаження. */}
      <Icon name={done ? "check" : "minus"} size={14} />
      <span className="wb-contact-stage-label">{label}</span>
      <span className="wb-contact-stage-value">
        {value}
        {note && <span className="wb-contact-stage-note"> {note}</span>}
      </span>
    </li>
  );
}

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
            {contact.joinedBotAt ? (
              // Лінк персональний і вже спрацював: показувати його як робочий
              // означало б обіцяти друге приєднання, якого не буде.
              <p className="wb-contact-joined">
                <Icon name="check" size={14} />
                Лінк використано — за ним уже прийшов контакт
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

          <div className="wb-field">
            <span className="wb-label">Приєднання</span>
            {/* Три кроки, і видно всі — навіть непройдені: «зайшов у бота» без
                «зайшов на платформу» це те, заради чого екран існує, і
                показати лише пройдене означало б сховати саме його. */}
            <ol className="wb-contact-stages">
              <StageRow
                done={contact.code !== null}
                label="Запрошено"
                value={contact.code ? "лінк складено" : "лінка немає"}
              />
              <StageRow
                done={contact.joinedBotAt !== null}
                label="Зайшов у бота"
                value={contact.joinedBotAt ? formatStamp(contact.joinedBotAt) : "ще ні"}
                note={contact.joinedUserId !== null ? `· id ${contact.joinedUserId}` : undefined}
              />
              <StageRow
                done={contact.joinedPlatformAt !== null}
                label="Зайшов на платформу"
                value={contact.joinedPlatformAt ? formatStamp(contact.joinedPlatformAt) : "ще ні"}
              />
            </ol>
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
