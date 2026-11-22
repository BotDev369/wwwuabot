import { icons } from "@wwwuabot/shared";
import { messageClock } from "@wwwuabot/shared/messages";
import { botMessageText } from "./bot-message-text";
import { useUserChat } from "./useUserChat";

interface Props {
  userId: number;
  /** Ім'я людини для шапки; без нього — номер. */
  title?: string;
  onClose: () => void;
  /** Зворотний перехід: переписка → картка користувача. */
  onOpenCard: (userId: number) => void;
}

/**
 * Переписка людини з ботом очима адміна: частина картки, а не окрема
 * сторінка. Ліворуч — людина, праворуч — бот; старші догортаються кнопкою
 * вгорі, куди й додається наступна порція.
 */
export function UserChatModal({ userId, title, onClose, onOpenCard }: Props) {
  const { messages, hasMore, loading, loadingMore, error, loadMore } = useUserChat(userId);

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal wb-modal-lg" onClick={(event) => event.stopPropagation()}>
        <div className="wb-modal-header">
          <span className="wb-modal-title">{`Переписка · ${title ?? `#${userId}`}`}</span>
          <button className="wb-close-btn" onClick={onClose} aria-label="Закрити">
            {icons["close"]}
          </button>
        </div>

        <div className="wb-modal-body wb-botlog">
          {loading && <p className="wb-text-muted">Завантаження переписки…</p>}
          {!loading && error && <p className="wb-text-red">{error}</p>}

          {!loading && !error && messages.length === 0 && (
            <p className="wb-text-muted">
              Переписки ще немає: людина не писала боту, і бот їй не відповідав.
            </p>
          )}

          {hasMore && (
            <button
              className="wb-btn wb-btn-secondary wb-btn-sm"
              onClick={() => void loadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? "Завантаження…" : "Показати ще 6"}
            </button>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`wb-bubble${message.direction === "out" ? " wb-bubble--out" : " wb-bubble--in"}`}
              title={message.direction === "out" ? "Бот" : "Людина"}
            >
              <span className="wb-bubble-text">{botMessageText(message)}</span>
              <span className="wb-bubble-time">{messageClock(message.created_at)}</span>
            </div>
          ))}
        </div>

        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary" onClick={onClose}>
            Закрити
          </button>
          <button className="wb-btn wb-btn-primary" onClick={() => onOpenCard(userId)}>
            {icons["user"]} Картка користувача
          </button>
        </div>
      </div>
    </div>
  );
}
