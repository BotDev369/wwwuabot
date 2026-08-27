import { useUsersStore } from "../../features/users/store";

export function UserBulkBar() {
  const { selectedIds, clearSelection, bulk } = useUsersStore();
  const count = selectedIds.size;

  if (count === 0) return null;

  return (
    <div className="usr-bulk-bar">
      <span className="usr-bulk-count">
        Вибрано: {count}
      </span>
      <button className="btn btn--secondary btn--sm" onClick={() => void bulk("block")}>
        🔒 Заблокувати
      </button>
      <button className="btn btn--secondary btn--sm" onClick={() => void bulk("unblock")}>
        🔓 Розблокувати
      </button>
      <button
        className="btn btn--danger btn--sm"
        onClick={() => {
          if (confirm(`Видалити ${count} користувачів?`)) void bulk("delete");
        }}
      >
        🗑️ Видалити
      </button>
      <button className="btn btn--secondary btn--sm" onClick={clearSelection}>
        ✕ Скасувати
      </button>
    </div>
  );
}
