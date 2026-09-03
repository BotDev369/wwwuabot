import { useUsersStore } from "../../features/users/store";
import { icons } from "@wwwuabot/shared";

const ico = (name: keyof typeof icons) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: 16, height: 16, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

export function UserBulkBar() {
  const { selectedIds, clearSelection, bulk } = useUsersStore();
  const count = selectedIds.size;

  if (count === 0) return null;

  return (
    <div className="usr-bulk-bar">
      <span className="usr-bulk-count">
        Вибрано: {count}
      </span>
      <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={() => void bulk("block")}>
        {ico("lock")} Заблокувати
      </button>
      <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={() => void bulk("unblock")}>
        {ico("unlock")} Розблокувати
      </button>
      <button
        className="wb-btn wb-btn-danger wb-btn-sm"
        onClick={() => {
          if (confirm(`Видалити ${count} користувачів?`)) void bulk("delete");
        }}
      >
        {ico("trash")} Видалити
      </button>
      <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={clearSelection}>
        ✕ Скасувати
      </button>
    </div>
  );
}
