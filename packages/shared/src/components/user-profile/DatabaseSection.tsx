import { FieldRow } from "./FieldRow";
import { RoleBadge, StatusBadge, ico } from "./badges";
import type { UserProfileData } from "./types";

/**
 * Дані, які ставить **система або адмін**: роль, тариф, статус, знижка,
 * права, блокування. Людина має бачити їх про себе — інакше «чому мені щось
 * недоступно» лишається здогадом.
 *
 * Адмінка показує тут ще й Telegram-дані, бо читає повний рядок `users`
 * (окремої колонки «Telegram» у неї немає).
 */
export function DatabaseSection({
  user,
  showTelegramFields,
}: {
  user: UserProfileData;
  showTelegramFields: boolean;
}) {
  return (
    <div className="wb-profile">
      <h3 className="wb-profile-title">{ico("clipboard")} Дані системи</h3>
      <div className="wb-profile-fields">
        {showTelegramFields && (
          <>
            <FieldRow label="ID" value={user.id} icon="info" />
            <FieldRow label="Ім'я" value={user.firstName} icon="edit" />
            <FieldRow label="Прізвище" value={user.lastName} icon="edit" />
            <FieldRow
              label="Telegram-хендл"
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
        <FieldRow
          label="Знижка"
          value={user.discount ? `${user.discount}%` : null}
          icon="percent"
        />
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
