import { Icon } from "@wwwuabot/shared";
import type { UserRow } from "../../../shared/api/users.api";

/** Що саме редагує бот: ці поля адмінка лише показує. */
export function UserInfoCard({ user }: { user: UserRow | null }) {
  return (
    <div className="wb-card">
      <div className="wb-card-header">
        <span className="wb-card-title">
          <Icon name="users" /> Інформація
        </span>
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
        <div>
          <strong>ID:</strong> {user?.user_id}
        </div>
        <div>
          <strong>Ім'я:</strong> {user?.first_name ?? "—"}
        </div>
        <div>
          <strong>Username:</strong> {user?.username ? `@${user.username}` : "—"}
        </div>
        <div>
          <strong>Мова:</strong> {user?.language ?? "—"}
        </div>
        <div>
          <strong>Створено:</strong> {user?.created_at ?? "—"}
        </div>
      </div>
    </div>
  );
}
