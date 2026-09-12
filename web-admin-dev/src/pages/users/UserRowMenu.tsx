import type { UserRow } from "../../shared/api/users.api";
import { useUsersStore } from "../../features/users/store";
import { icons } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";

const ico = (name: keyof typeof icons) => (
  <span
    style={{ display: "inline-flex", alignItems: "center", width: 18, height: 18, flexShrink: 0 }}
  >
    {icons[name]}
  </span>
);

interface Props {
  user: UserRow;
  onMessage: () => void;
  onClose: () => void;
}

export function UserRowMenu({ user, onMessage, onClose }: Props) {
  const dialog = useDialog();
  const { deleteOne, blockOne } = useUsersStore();
  const blocked = user.is_blocked === 1;

  async function handleDelete() {
    const ok = await dialog.confirm(`Видалити користувача ${user.user_id}?`, {
      tone: "danger",
      confirmText: "Видалити",
    });
    if (!ok) return;
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
        {ico("mail")} Написати
      </button>
      <button className="usr-menu-item" onClick={handleBlock}>
        {blocked ? <>{ico("unlock")} Розблокувати</> : <>{ico("lock")} Заблокувати</>}
      </button>
      <div className="usr-menu-divider" />
      <button className="usr-menu-item usr-menu-item--danger" onClick={handleDelete}>
        {ico("trash")} Видалити
      </button>
    </div>
  );
}
