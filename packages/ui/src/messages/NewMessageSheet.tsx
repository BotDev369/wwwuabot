/**
 * Форма нового листа — **кому** і **тіло**, з чернеткою як окремою річчю.
 *
 * **Форма починається порожньою** — її відкриває «+», а це «новий лист».
 * Підставляти в неї чужу чернетку означало б вирішувати за людину, що вона
 * пише: чернеток може бути багато, і **кожна входить своїм рядком** у списку
 * (`DraftList`), де вже видно і адресата, і текст.
 *
 * **Адресат необов'язковий.** Лист без «кому» — це стан: текст написано, адресат
 * ще не вибраний. Тому тут немає ні вимоги його вказати, ні порожнього стану
 * замість полів: порожній лист зберігається як чернетка, а надіслати його не
 * можна, доки адресата немає (кнопка гасне).
 *
 * **Чернетка без тексту не лишається.** Зберегти порожній лист можна — і це
 * прибирає чернетку (адресат її не тримає, див. `MessageDraftInput`): так її
 * й видаляють, стерши текст.
 *
 * **Ні надсилання, ні збереження форма не робить сама** — це справа оболонки
 * (як і в розмові): вона веде стан, показує помилку й вирішує, що відкрити після
 * відправки. Тут лишається те, що однакове: поля, межі й те, коли кнопки
 * справді щось роблять.
 *
 * @module @wwwuabot/ui/messages
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  MAX_MESSAGE_BODY,
  isSendableBody,
  peerLabel,
  type MessageDraftInput,
} from "@wwwuabot/shared/messages";
import { MenuModal } from "../menu";
import { NewMessagePicker } from "./NewMessagePicker";
import { NO_RECIPIENT_LABEL } from "./drafts";
import type { NewMessageSheetProps } from "./types";

/** `id` поля тіла — щоб підпис справді вказував на нього, а не стояв поруч. */
const BODY_ID = "wb-compose-body";

export function NewMessageSheet({
  recipients,
  draft = null,
  onSaveDraft,
  onSend,
  onClose,
}: NewMessageSheetProps): ReactElement {
  // Початковий стан — або чистий аркуш, або **та сама** чернетка, яку відкрили:
  // далі форму веде людина, і перечитування чернеток на кожному рендері
  // затирало б набране.
  const [peerId, setPeerId] = useState<number | null>(draft?.peerId ?? null);
  const [body, setBody] = useState(() => draft?.body ?? "");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const chosen = peerId === null ? null : (recipients.find((peer) => peer.id === peerId) ?? null);
  const filled = isSendableBody(body);
  const sendable = peerId !== null && filled && !busy;
  // Зберегти можна й без тексту — але тільки в **наявної** чернетки, де ця дія
  // означає «прибрати». Новий порожній лист зберігати нема чого.
  const savable = !busy && (filled || draft !== null);

  const input: MessageDraftInput = { id: draft?.id ?? null, peerId, body };

  async function save(): Promise<void> {
    if (!savable) return;
    setBusy(true);
    const ok = await onSaveDraft(input);
    setBusy(false);
    if (ok) onClose();
  }

  async function send(): Promise<void> {
    if (!sendable) return;
    setBusy(true);
    const ok = await onSend(input);
    setBusy(false);
    if (ok) onClose();
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
                  {chosen ? peerLabel(chosen) : NO_RECIPIENT_LABEL}
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
          onSelect={(id) => {
            setPicking(false);
            setPeerId(id);
          }}
          onClear={
            peerId === null
              ? undefined
              : () => {
                  setPicking(false);
                  setPeerId(null);
                }
          }
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}
