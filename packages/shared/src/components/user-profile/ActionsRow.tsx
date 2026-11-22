import { ico } from "./badges";

/** Дії адмінки над користувачем. Немає жодного обробника — немає й панелі. */
export function ActionsRow({
  userId,
  onEdit,
  onMessage,
  onChat,
}: {
  userId: number;
  onEdit?: (userId: number) => void;
  onMessage?: (userId: number) => void;
  onChat?: (userId: number) => void;
}) {
  if (!onEdit && !onMessage && !onChat) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        justifyContent: "flex-end",
        marginTop: 16,
        paddingTop: 12,
        borderTop: "1px solid var(--border, #e5e7eb)",
      }}
    >
      {onChat && (
        <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={() => onChat(userId)}>
          {ico("message-square")} Переписка
        </button>
      )}
      {onMessage && (
        <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={() => onMessage(userId)}>
          {ico("mail")} Написати
        </button>
      )}
      {onEdit && (
        <button className="wb-btn wb-btn-primary wb-btn-sm" onClick={() => onEdit(userId)}>
          {ico("edit")} Змінити
        </button>
      )}
    </div>
  );
}
