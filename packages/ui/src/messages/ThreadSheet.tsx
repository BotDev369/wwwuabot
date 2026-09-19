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
 * **Позначка платформи (`system`) бульбашкою не стає.** Стрічка відкривається
 * двома такими рядками (запрошення й встановлений контакт), і якби вони
 * виглядали як чиєсь повідомлення, людина приписувала б їх співрозмовнику —
 * а сторона бульбашки в переписці означає саме автора. Тому вони стоять
 * посередині, приглушеним текстом: це не репліка, це стан розмови.
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
  onClear,
  onDelete,
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
        <div className="wb-modal-header wb-sheet-head wb-thread-head">
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

          {/* Дві дії над перепискою — самими знаками й без тла: у шапці вже стоїть
              «назад», а другий гурток поруч читався б як ще один вихід. Стирання
              й видалення — різні речі й різні знаки; підпис живе в `aria-label`,
              бо знак без імені не має назви для того, хто не бачить. */}
          <div className="wb-thread-actions">
            <button
              type="button"
              className="wb-thread-action"
              onClick={onClear}
              aria-label="Очистити переписку"
              title="Очистити переписку"
            >
              <Icon name="eraser" size={18} />
            </button>
            <button
              type="button"
              className="wb-thread-action"
              onClick={onDelete}
              aria-label="Видалити розмову"
              title="Видалити розмову"
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        </div>

        <div className="wb-modal-body wb-thread-body" ref={bodyRef}>
          {loading && <p className="wb-text-muted wb-thread-note">Завантаження розмови…</p>}

          {!loading && error && <p className="wb-text-red wb-thread-note">{error}</p>}

          {/* Порожня стрічка означає «розмова нова, а не поламана»: тому цей рядок і
              каже, що робити далі. У розмови, яка почалась із запрошення, він не
              з'явиться — там уже стоять позначки платформи. */}
          {!loading && !error && messages.length === 0 && (
            <p className="wb-text-muted wb-thread-note">
              Повідомлень ще немає. Напишіть перше — співрозмовник побачить його, коли відкриє
              платформу.
            </p>
          )}

          {messages.map((message) =>
            message.system ? (
              <p key={message.id} className="wb-thread-system">
                {message.body}
              </p>
            ) : (
              <div
                key={message.id}
                className={`wb-bubble${message.senderId === meId ? " wb-bubble--out" : " wb-bubble--in"}`}
              >
                <span className="wb-bubble-text">{message.body}</span>
                <span className="wb-bubble-time">{messageClock(message.createdAt)}</span>
              </div>
            ),
          )}
        </div>

        <MessageComposer sending={sending} onSend={onSend} />
      </div>
    </div>
  );
}
