/**
 * Список розмов — рядок на співрозмовника, групами.
 *
 * Рядок **читають**, тож він на всю ширину: аватар, ім'я, другий підпис,
 * останнє повідомлення, час і те, що чекає на прочитання. Ім'я — те саме, що в
 * шапці розмови (`peerLabel`): підпис у списку й підпис у переписці мусять
 * збігатися, інакше людина двічі знайомиться з однією людиною.
 *
 * **Рядок тут — не акордеон**, на відміну від контактів і нотаток: дотик до
 * нього **відкриває переписку**, і другий стан у тому ж жесті забрав би
 * головну дію екрана. Тому замість «розгорнути все» тут смуга фільтрів, а
 * вигляд (рядки / плитки) лишається тим самим кирпичиком `@wwwuabot/ui/collection`.
 *
 * **Два порожніх стани — різні речі.** «Ще немає з ким листуватись» — це коли
 * розмов немає взагалі (і тоді видно, як їх завести), «нічого не знайдено» —
 * коли їх відсіяли пошуком чи фільтром. Один текст на обидва випадки казав би
 * людині неправду й не лишав би виходу.
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
import { collectionViewClass } from "../collection";
import { conversationLine } from "./lines";
import type { ConversationListProps } from "./types";

/** Аватар: фото з Telegram, якщо воно є, інакше — літера з підпису. */
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
  groups,
  total,
  meId,
  onOpen,
  collection,
  onReset,
}: ConversationListProps): ReactElement {
  if (total === 0) {
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

  if (groups.length === 0) {
    return (
      <div className="wb-empty">
        <span className="wb-empty-icon">
          <Icon name="search" size={32} />
        </span>
        <p className="wb-empty-text">Нічого не знайдено за цим запитом.</p>
        {onReset && (
          <button type="button" className="wb-btn wb-btn-secondary" onClick={onReset}>
            <Icon name="close" size={16} />
            Скинути пошук і фільтри
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <section key={group.key} className="wb-conv-group">
          {/* Єдина група — це «без груп»: її титул повторював би назву екрана, і
              він має сенс лише там, де груп справді кілька. */}
          {groups.length > 1 && (
            <h2 className="wb-conv-group-title">
              {group.label}
              {/* Кількість у заголовку — щоб «тут 12 розмов» було видно, не
                  рахуючи очима. */}
              <span className="wb-conv-group-count">{group.conversations.length}</span>
            </h2>
          )}
          <ul className={`wb-conv-list ${collectionViewClass(collection)}`}>
            {group.conversations.map((conversation) => (
              <li key={conversation.peer.id} className="wb-conv-item">
                <Row conversation={conversation} meId={meId} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
