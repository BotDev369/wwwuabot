/**
 * Список розмов — рядок на співрозмовника.
 *
 * Рядок **читають**, тож він на всю ширину (як пункт списку в меню): ім'я,
 * останнє повідомлення, час і те, що чекає на прочитання. Плитки тут не
 * працюють: у плитці нема місця ні під текст, ні під час, і саме за ними в
 * список розмов і заходять.
 *
 * Розмітка — `.wb-conv*` (`packages/shared/src/styles/messages.css`), бо це
 * рендерить спільний код: приватних класів оболонки тут немає.
 *
 * @module @wwwuabot/ui/messages
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Conversation } from "@wwwuabot/shared/messages";
import { messageTime, peerInitial, peerLabel, peerSecondary } from "@wwwuabot/shared/messages";
import { conversationLine } from "./lines";
import type { ConversationListProps } from "./types";

/** Аватар: фото з Telegram, якщо воно є, інакше — літера. */
function Avatar({ conversation }: { conversation: Conversation }): ReactElement {
  const { photoUrl } = conversation.peer;

  return (
    <span className="wb-conv-avatar">
      {photoUrl ? (
        <img src={photoUrl} alt="" loading="lazy" />
      ) : (
        // Літера — без окремого класу: комірка вже тримає розмір, колір і
        // центрування, а зайвий клас без правила — це тихо нічого (AGENTS.md §7).
        peerInitial(conversation.peer)
      )}
    </span>
  );
}

function Row({
  conversation,
  meId,
  onOpen,
}: {
  conversation: Conversation;
  meId: number;
  onOpen: (peerId: number) => void;
}): ReactElement {
  const peer = conversation.peer;
  const label = peerLabel(peer);
  const secondary = peerSecondary(peer);
  const time = messageTime(conversation.lastMessageAt);
  const line = conversationLine(conversation, meId);

  return (
    <button
      type="button"
      className="wb-conv"
      onClick={() => onOpen(peer.id)}
      // Ім'я в підписі, бо рядок містить ще й текст повідомлення: без цього
      // скрінрідер прочитав би рядок як одну суцільну фразу.
      aria-label={`${label}. ${line}`}
    >
      <Avatar conversation={conversation} />

      <span className="wb-conv-main">
        <span className="wb-conv-name">{label}</span>
        {secondary && <span className="wb-conv-secondary">{secondary}</span>}
        <span className="wb-conv-last">{line}</span>
      </span>

      <span className="wb-conv-meta">
        <span className="wb-conv-time">{time}</span>
        {conversation.unread > 0 && (
          <span className="wb-badge wb-badge-accent wb-conv-unread">{conversation.unread}</span>
        )}
      </span>
    </button>
  );
}

export function ConversationList({
  conversations,
  meId,
  onOpen,
}: ConversationListProps): ReactElement {
  if (conversations.length === 0) {
    return (
      <div className="wb-empty">
        <span className="wb-empty-icon">
          <Icon name="message-square" size={32} />
        </span>
        {/* Порожній екран — це не «немає повідомлень», а «немає з ким»: початі
            розмови й ті, кого ще немає, стоять в одному списку, тож цей стан
            показується лише тоді, коли писати справді нікому. */}
        <p className="wb-empty-text">Ще немає з ким листуватись.</p>
        <p className="wb-empty-text">
          Писати можна тим, із ким ви зв'язані через контакти: хто прийшов за вашим посиланням або
          за чиїм прийшли ви. Відкрийте «Контакти» й надішліть запрошення.
        </p>
      </div>
    );
  }

  return (
    <div className="wb-conv-list">
      {conversations.map((conversation) => (
        <Row key={conversation.peer.id} conversation={conversation} meId={meId} onOpen={onOpen} />
      ))}
    </div>
  );
}
