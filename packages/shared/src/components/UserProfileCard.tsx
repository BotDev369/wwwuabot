import { ActionsRow } from "./user-profile/ActionsRow";
import { DatabaseSection } from "./user-profile/DatabaseSection";
import { PlatformHandle } from "./user-profile/PlatformHandle";
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
 *
 * Розділи, у порядку показу:
 *   1. **Ім'я на платформі** — головне ім'я людини в продукті (обидві оболонки);
 *   2. аватар і Telegram-ім'я;
 *   3. **дані Telegram як є** (платформа) або збережене ботом (адмінка);
 *   4. дані системи й адміна: роль, тариф, статус, знижка, права, блокування;
 *   5. сирий JSON — для діагностики.
 */
export function UserProfileCard({
  user,
  variant = "platform",
  loading,
  error,
  onChangeUsername,
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
  const hasTelegram = Boolean(user.telegram && Object.keys(user.telegram).length > 0);

  return (
    <div>
      <PlatformHandle value={user.platformUsername} onSubmit={onChangeUsername} />

      <ProfileIdentity user={user} showId={isAdmin} />

      {hasTelegram && <TelegramSection user={user} />}

      {/*
        Адмінка дістає Telegram-поля з рядка `users` лише тоді, коли збереженого
        payload немає (старі рядки, до появи `telegram_json`). Інакше ті самі
        ім'я, хендл і мова стояли б у картці двічі — а два місця для одного
        факту рано чи пізно розказують різне.
      */}
      <DatabaseSection user={user} showTelegramFields={isAdmin && !hasTelegram} />

      {isAdmin && user.rawFields && <RawFieldsSection fields={user.rawFields} />}

      {!isAdmin && <RawJsonDetails value={user} />}

      {isAdmin && <ActionsRow userId={user.id} onEdit={onEdit} onMessage={onMessage} />}
    </div>
  );
}
