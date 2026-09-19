/**
 * Форма нового повідомлення — **кому** і **тіло**, а не порожній аркуш.
 *
 * Адресата обирають зі списку зв'язаних контактів (`NewMessagePicker`) — писати
 * іншим однаково не можна, і порожній аркуш обіцяв би лист будь-кому, а потім
 * відмовляв би 404. Тіло — та сама межа, що в розмові (`MAX_MESSAGE_BODY`).
 *
 * **Чернетка — це стан форми, а не розмови.** Форма відкривається найсвіжішою
 * чернеткою (адресат і текст), а зміна адресата підхоплює чернетку саме цієї
 * людини: у людини може бути по чернетці на кожного, і «останній відкритий»
 * текст не мусить переїхати до іншого адресата сам.
 *
 * **Ні надсилання, ні збереження форма не робить сама** — це справа оболонки
 * (як і в розмові): вона веде стан, показує помилку й вирішує, що відкрити
 * після відправки. Тут лишається те, що однакове: поля, межі й те, коли кнопки
 * справді щось роблять.
 *
 * @module @wwwuabot/ui/messages
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MAX_MESSAGE_BODY, isSendableBody, peerLabel } from "@wwwuabot/shared/messages";
import { MenuModal } from "../menu";
import { NewMessagePicker } from "./NewMessagePicker";
import { NO_PEERS_HINT, NO_PEERS_TITLE } from "./empty";
import { draftFor, latestDraft } from "./drafts";
import type { NewMessageSheetProps } from "./types";

/** `id` поля тіла — щоб підпис справді вказував на нього, а не стояв поруч. */
const BODY_ID = "wb-compose-body";

export function NewMessageSheet({
  recipients,
  drafts,
  onSaveDraft,
  onSend,
  onClose,
}: NewMessageSheetProps): ReactElement {
  // Початковий стан беремо з чернеток один раз: далі форму веде людина, і
  // перечитування чернеток на кожному рендері затирало б набране.
  const [peerId, setPeerId] = useState<number | null>(() => latestDraft(drafts)?.peerId ?? null);
  const [body, setBody] = useState(() => latestDraft(drafts)?.body ?? "");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const chosen = peerId === null ? null : (recipients.find((peer) => peer.id === peerId) ?? null);
  const sendable = peerId !== null && isSendableBody(body) && !busy;
  const savable = peerId !== null && !busy;

  /** Обрали людину: беремо **її** чернетку, якщо вона вже є. */
  function choose(id: number): void {
    setPicking(false);
    setPeerId(id);
    const saved = draftFor(drafts, id);
    if (saved) setBody(saved.body);
  }

  async function save(): Promise<void> {
    if (peerId === null || busy) return;
    setBusy(true);
    const ok = await onSaveDraft(peerId, body);
    setBusy(false);
    if (ok) onClose();
  }

  async function send(): Promise<void> {
    if (!sendable) return;
    setBusy(true);
    const ok = await onSend(peerId!, body);
    setBusy(false);
    if (ok) onClose();
  }

  if (recipients.length === 0) {
    return (
      <MenuModal
        title="Нове повідомлення"
        onClose={onClose}
        content={
          <div className="wb-empty">
            <span className="wb-empty-icon">
              <Icon name="mail" size={32} />
            </span>
            <p className="wb-empty-text">{NO_PEERS_TITLE}</p>
            <p className="wb-empty-text">{NO_PEERS_HINT}</p>
          </div>
        }
      />
    );
  }

  return (
    <>
      <MenuModal
        title="Нове повідомлення"
        onClose={onClose}
        content={
          <div className="wb-compose">
            <div className="wb-field">
              {/* Поле-кнопка, а не випадаючий список: вибір відкриває
                  повноекранну поверхню (правило 4), і дотик по цьому рядку
                  читається як «тут вибирають», а не як ввід тексту. */}
              <span className="wb-label">Кому</span>
              <button
                type="button"
                className="wb-compose-pick"
                onClick={() => setPicking(true)}
                aria-label={chosen ? `Кому: ${peerLabel(chosen)}` : "Обрати контакт"}
              >
                <span
                  className={`wb-compose-pick-value${chosen ? "" : " wb-compose-pick-value--empty"}`}
                >
                  {chosen ? peerLabel(chosen) : "Оберіть контакт"}
                </span>
                <Icon name="chevron-down" size={16} />
              </button>
            </div>

            <div className="wb-field">
              <label className="wb-label" htmlFor={BODY_ID}>
                Тіло
              </label>
              <textarea
                id={BODY_ID}
                className="wb-textarea wb-compose-body"
                value={body}
                maxLength={MAX_MESSAGE_BODY}
                placeholder="Що написати…"
                onChange={(event) => setBody(event.target.value)}
              />
            </div>

            {/* Дві дії, а не одна з вибором «надіслати чи зберегти»: результат
                у них різний — лист пішов людині або лишився чернеткою. */}
            <div className="wb-sheet-actions">
              <button
                type="button"
                className="wb-btn wb-btn-secondary"
                onClick={() => void save()}
                disabled={!savable}
              >
                <Icon name="save" size={16} />
                Зберегти чернетку
              </button>
              <button
                type="button"
                className="wb-btn wb-btn-primary"
                onClick={() => void send()}
                disabled={!sendable}
              >
                <Icon name="arrow-up" size={16} />
                Надіслати
              </button>
            </div>
          </div>
        }
      />

      {picking && (
        <NewMessagePicker
          recipients={recipients}
          onSelect={choose}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}
