import type { UserRow } from "../../shared/api/users.api";
import { useUsersStore } from "../../features/users/store";

interface Props {
  user: UserRow;
  onMessage: () => void;
  onClose: () => void;
}

export function UserRowMenu({ user, onMessage, onClose }: Props) {
  const { deleteOne, blockOne } = useUsersStore();
  const blocked = user.is_blocked === 1;

  async function handleDelete() {
    if (!confirm(`Видалити користувача ${user.user_id}?`)) return;
    await deleteOne(user.user_id);
    onClose();
  }

  async function handleBlock() {
    await blockOne(user.user_id, !blocked);
    onClose();
  }

  return (
    <div className="usr-menu">
      <button className="usr-menu-item" onClick={onMessage}>
        ✉️ Написати
      </button>
      <button className="usr-menu-item" onClick={handleBlock}>
        {blocked ? "🔓 Розблокувати" : "🔒 Заблокувати"}
      </button>
      <div className="usr-menu-divider" />
      <button className="usr-menu-item usr-menu-item--danger" onClick={handleDelete}>
        🗑️ Видалити
      </button>
    </div>
  );
}
