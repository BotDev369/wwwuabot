import { FieldRow } from "./FieldRow";
import { RoleBadge, StatusBadge, ico } from "./badges";
import type { UserProfileData } from "./types";

/** Поля рядка `users`. Адмінка показує ще й Telegram-дані, бо рядок повний. */
export function DatabaseSection({
  user,
  showTelegramFields,
}: {
  user: UserProfileData;
  showTelegramFields: boolean;
}) {
  return (
    <div className="wb-profile">
      <h3 className="wb-profile-title">{ico("clipboard")} Дані з бази</h3>
      <div className="wb-profile-fields">
        {showTelegramFields && (
          <>
            <FieldRow label="ID" value={user.id} icon="info" />
            <FieldRow label="Ім'я" value={user.firstName} icon="edit" />
            <FieldRow label="Прізвище" value={user.lastName} icon="edit" />
            <FieldRow
              label="Username"
              value={user.username ? `@${user.username}` : null}
              icon="globe"
            />
            <FieldRow label="Мова" value={user.language} icon="globe" />
          </>
        )}
        <FieldRow
          label="Роль"
          value={user.role ? <RoleBadge value={user.role} /> : null}
          icon="users"
        />
        <FieldRow label="Тариф" value={user.tariff} icon="sparkles" />
        <FieldRow
          label="Статус"
          value={user.status ? <StatusBadge value={user.status} /> : null}
          icon="check"
        />
        <FieldRow label="Знижка" value={user.discount ? `${user.discount}%` : null} icon="info" />
        <FieldRow
          label="Дозволи"
          value={
            user.permissions && user.permissions.length > 0 ? user.permissions.join(", ") : null
          }
          icon="lock"
        />
        <FieldRow label="Заблоковано" value={user.isBlocked ? "Так" : "Ні"} icon="lock" />
        {user.createdAt && <FieldRow label="Створено" value={user.createdAt} icon="info" />}
        {user.updatedAt && <FieldRow label="Оновлено" value={user.updatedAt} icon="info" />}
      </div>
    </div>
  );
}
