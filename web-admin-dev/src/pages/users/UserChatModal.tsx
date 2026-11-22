import { icons } from "@wwwuabot/shared";
import { messageClock } from "@wwwuabot/shared/messages";
import { useDialog } from "@wwwuabot/ui/dialog";
import { botMessageText } from "./bot-message-text";
import { useUserChat } from "./useUserChat";
import type { BotMessageRow } from "../../shared/api/users.api";

interface Props {
  userId: number;
  /** Ім'я людини для шапки; без нього — номер. */
  title?: string;
  onClose: () => void;
  /** Зворотний перехід: переписка → картка користувача. */
  onOpenCard: (userId: number) => void;
}

/**
 * Переписка людини з ботом очима адміна: старші догортаються по 6.
 *
 * Правити можна лише повідомлення бота, видаляти — будь-чиє; вікно 48 годин
 * перевіряє сервер. Видалене лишається в історії з позначкою, без дій.
 */
export function UserChatModal({ userId, title, onClose, onOpenCard }: Props) {
  const dialog = useDialog();
  const { messages, hasMore, loading, loadingMore, error, loadMore, edit, remove } =
    useUserChat(userId);

  async function handleEdit(message: BotMessageRow) {
    if (message.message_id === null) return;
    const value = await dialog.prompt("Новий текст повідомлення", {
      title: "Редагувати повідомлення",
      defaultValue: botMessageText(message),
      confirmText: "Зберегти",
      validate: (candidate) => (candidate.trim() ? null : "Порожній текст не можна зберегти"),
    });
    if (value === null) return;

    try {
      await edit(message, value.trim());
    } catch (cause: unknown) {
      await dialog.alert(cause instanceof Error ? cause.message : String(cause), {
        tone: "danger",
      });
    }
  }

  async function handleDelete(message: BotMessageRow) {
    if (message.message_id === null) return;
    const confirmed = await dialog.confirm(
      "Видалити повідомлення з Telegram? В історії воно лишиться з позначкою «видалено».",
      { tone: "danger", confirmText: "Видалити" },
    );
    if (!confirmed) return;

    try {
      await remove(message);
    } catch (cause: unknown) {
      await dialog.alert(cause instanceof Error ? cause.message : String(cause), {
        tone: "danger",
      });
    }
  }

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

          {messages.map((message) => {
            const deleted = Boolean(message.deleted_at);
            return (
              <div
                key={message.id}
                className={`wb-bubble${message.direction === "out" ? " wb-bubble--out" : " wb-bubble--in"}${deleted ? " wb-bubble--deleted" : ""}`}
                title={message.direction === "out" ? "Бот" : "Людина"}
              >
                <span className="wb-bubble-text">{botMessageText(message)}</span>
                {deleted && <span className="wb-bubble-note">видалено</span>}
                <span className="wb-bubble-time">{messageClock(message.created_at)}</span>

                {!deleted && message.message_id !== null && (
                  <span className="wb-bubble-tools">
                    {message.direction === "out" && (
                      <button className="wb-bubble-tool" onClick={() => void handleEdit(message)}>
                        Змінити
                      </button>
                    )}
                    <button className="wb-bubble-tool" onClick={() => void handleDelete(message)}>
                      Видалити
                    </button>
                  </span>
                )}
              </div>
            );
          })}
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
