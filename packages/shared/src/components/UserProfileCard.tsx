import { ActionsRow } from "./user-profile/ActionsRow";
import { DatabaseSection } from "./user-profile/DatabaseSection";
import { ProfileIdentity } from "./user-profile/ProfileIdentity";
import { RawFieldsSection } from "./user-profile/RawFieldsSection";
import { RawJsonDetails } from "./user-profile/RawJsonDetails";
import { TelegramSection } from "./user-profile/TelegramSection";
import type { UserProfileCardProps, UserProfileData } from "./user-profile/types";

export type { UserProfileCardProps, UserProfileData };

/**
 * Картка користувача для обох оболонок: `variant` — це **не** різниця у вигляді,
 * а різниця в тому, які дані взагалі є (платформа має `initData`, адмінка — рядок
 * `users` цілком). Розмітку тримають кирпичики `.wb-profile*`.
 */
export function UserProfileCard({
  user,
  variant = "platform",
  loading,
  error,
  onEdit,
  onMessage,
}: UserProfileCardProps) {
  if (loading) {
    return (
      <div className="wb-empty">
        <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
        <p className="wb-text-muted">Завантаження даних…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="wb-empty">
        <p className="wb-text-red">Помилка: {error}</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="wb-empty">
        <p className="wb-text-muted">Користувача не знайдено</p>
      </div>
    );
  }

  const isAdmin = variant === "admin";

  return (
    <div>
      <ProfileIdentity user={user} showId={isAdmin} />

      {!isAdmin && <TelegramSection user={user} />}

      <DatabaseSection user={user} showTelegramFields={isAdmin} />

      {isAdmin && user.rawFields && <RawFieldsSection fields={user.rawFields} />}

      {!isAdmin && <RawJsonDetails value={user} />}

      {isAdmin && <ActionsRow userId={user.id} onEdit={onEdit} onMessage={onMessage} />}
    </div>
  );
}
