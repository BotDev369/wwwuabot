/**
 * Поле вводу повідомлення — той рядок, куди пише рука.
 *
 * Форма у **смузі поверхні**, а не останнім рядком тіла: тіло прокручується, і
 * поле, яке їде разом із ним, зникає саме тоді, коли його шукають. Це той самий
 * кирпичик `.wb-sheet-bar`, що несе перемикач і вихід у профілі, — лише з
 * іншим вмістом.
 *
 * Кнопка надсилання — **коло зі знаком** і вона видима завжди: на телефоні
 * `hover` не існує, тож дія, прихована до наведення, не покажеться ніколи
 * (AGENTS.md §3). Гасне вона (не зникає) лише на порожньому полі — там справді
 * нічого надсилати.
 *
 * @module @wwwuabot/ui/messages
 */

import { useState, type FormEvent, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { isSendableBody, MAX_MESSAGE_BODY } from "@wwwuabot/shared/messages";

interface MessageComposerProps {
  sending?: boolean;
  /** Надіслати; `true` — сервер підтвердив (див. нижче про очищення поля). */
  onSend: (body: string) => Promise<boolean>;
}

export function MessageComposer({ sending = false, onSend }: MessageComposerProps): ReactElement {
  const [draft, setDraft] = useState("");
  const sendable = isSendableBody(draft) && !sending;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!sendable) return;

    // Поле чистимо **після** підтвердження сервера. Очистити до нього — це
    // втрачений текст на кожній обірваній мережі: людина писала б його знову,
    // і винною виглядала б вона.
    if (await onSend(draft)) setDraft("");
  }

  return (
    <form className="wb-sheet-bar wb-thread-bar" onSubmit={(event) => void submit(event)}>
      <input
        type="text"
        className="wb-input wb-thread-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Повідомлення…"
        aria-label="Текст повідомлення"
        maxLength={MAX_MESSAGE_BODY}
        autoComplete="off"
        enterKeyHint="send"
      />
      <button type="submit" className="wb-thread-send" disabled={!sendable} aria-label="Надіслати">
        <Icon name="arrow-up" size={20} />
      </button>
    </form>
  );
}
