import { FieldRow } from "./FieldRow";
import { ico } from "./badges";
import type { UserProfileData } from "./types";

/** Поля, які Telegram віддає в `initData` — лише у поданні платформи. */
export function TelegramSection({ user }: { user: UserProfileData }) {
  const yesNo = (v: boolean | undefined) => (v === true ? "Так" : v === false ? "Ні" : "—");

  return (
    <div className="wb-profile">
      <h3 className="wb-profile-title">{ico("bot")} Telegram дані</h3>
      <div className="wb-profile-fields">
        <FieldRow label="User ID" value={user.id} icon="info" />
        <FieldRow label="Ім'я" value={user.firstName} icon="edit" />
        <FieldRow label="Прізвище" value={user.lastName} icon="edit" />
        <FieldRow
          label="Username"
          value={user.username ? `@${user.username}` : null}
          icon="globe"
        />
        <FieldRow label="Мова" value={user.language} icon="globe" />
        <FieldRow label="Premium" value={yesNo(user.isPremium)} icon="sparkles" />
        <FieldRow label="Бот" value={yesNo(user.isBot)} icon="bot" />
        <FieldRow label="Додано в меню" value={yesNo(user.addedToMenu)} icon="settings" />
      </div>
    </div>
  );
}
