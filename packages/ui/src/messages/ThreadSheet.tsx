/**
 * Розмова — повноекранна поверхня зі стрічкою бульбашок і полем вводу.
 *
 * **Чому повноекранна, а не «аркуш».** Переписка — це місце, у якому живуть:
 * стрічка має займати висоту, а поле вводу — бути під пальцем. Аркуш із
 * полями по краях віддав би цій роботі половину екрана.
 *
 * Складається з **наявних кирпичиків**: `.wb-modal-overlay--screen` +
 * `.wb-modal--full wb-modal--screen wb-sheet` + `.wb-sheet-head` (шапка з
 * «назад») + `.wb-sheet-bar` (смуга з полем). Те, чого не було, — саме стрічка
 * (`.wb-thread*`), і тільки воно лежить у `messages.css`.
 *
 * **Бульбашка праворуч — моя, ліворуч — чужа.** Це не оформлення: у переписці
 * двох людей «хто сказав» — половина змісту, і колір тут єдине, що відрізняє
 * своє від чужого на швидкому погляді. Тому сторона береться з `senderId`, а не
 * з порядку повідомлень.
 *
 * @module @wwwuabot/ui/messages
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { messageClock, peerLabel, peerSecondary } from "@wwwuabot/shared/messages";
import { MessageComposer } from "./MessageComposer";
import type { ThreadSheetProps } from "./types";
import { useStickToBottom } from "./useStickToBottom";

export function ThreadSheet({
  peer,
  meId,
  messages,
  loading = false,
  error = null,
  sending = false,
  onSend,
  onClose,
}: ThreadSheetProps): ReactElement {
  const label = peerLabel(peer);
  const secondary = peerSecondary(peer);
  const bodyRef = useStickToBottom(messages.length);

  return (
    <div className="wb-modal-overlay wb-modal-overlay--screen" onClick={onClose}>
      <div
        className="wb-modal wb-modal--full wb-modal--screen wb-sheet wb-thread"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="wb-modal-header wb-sheet-head">
          {/* «Назад», а не «закрити»: поверхня відкривається зі списку розмов, і
              дотик повертає саме туди — це звичайна навігація, а не вихід із
              форми. */}
          <button type="button" className="wb-close-btn" onClick={onClose} aria-label="Назад">
            <Icon name="arrow-left" size={18} />
          </button>
          <h2 className="wb-modal-title wb-thread-name">
            {label}
            {secondary && <span className="wb-thread-sub">{secondary}</span>}
          </h2>
        </div>

        <div className="wb-modal-body wb-thread-body" ref={bodyRef}>
          {loading && <p className="wb-text-muted wb-thread-note">Завантаження розмови…</p>}

          {!loading && error && <p className="wb-text-red wb-thread-note">{error}</p>}

          {!loading && !error && messages.length === 0 && (
            <p className="wb-text-muted wb-thread-note">
              Повідомлень ще немає. Напишіть перше — співрозмовник побачить його, коли відкриє
              платформу.
            </p>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`wb-bubble${message.senderId === meId ? " wb-bubble--out" : " wb-bubble--in"}`}
            >
              <span className="wb-bubble-text">{message.body}</span>
              <span className="wb-bubble-time">{messageClock(message.createdAt)}</span>
            </div>
          ))}
        </div>

        <MessageComposer sending={sending} onSend={onSend} />
      </div>
    </div>
  );
}
