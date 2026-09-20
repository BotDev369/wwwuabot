import { ActionsRow } from "./user-profile/ActionsRow";
import { DatabaseSection } from "./user-profile/DatabaseSection";
import { PlatformHandle } from "./user-profile/PlatformHandle";
import { ProfileIdentity } from "./user-profile/ProfileIdentity";
import { RawFieldsSection } from "./user-profile/RawFieldsSection";
import { TelegramSection } from "./user-profile/TelegramSection";
import { hasTelegramFields } from "./user-profile/telegram-fields";
import type { UserProfileCardProps, UserProfileData } from "./user-profile/types";

export type { UserProfileCardProps, UserProfileData };

/**
 * Картка користувача **для адмінки**: повний рядок `users` про людину.
 *
 * Розділи, у порядку показу:
 *   1. **Ім'я на платформі** — головне ім'я людини в продукті (тільки читання:
 *      чуже ім'я адмін не переписує випадково);
 *   2. аватар і Telegram-ім'я;
 *   3. **дані Telegram як є** або збережене ботом, коли payload ще не писався;
 *   4. дані системи: роль, тариф, статус, знижка, права, блокування;
 *   5. сирі поля рядка — для діагностики.
 *
 * **Чому це не екран користувача.** Людина бачить себе на `/profile/account` у
 * платформі — там ті самі дані розділені на два погляди: «Платформа» (як її
 * бачать інші та що про неї знає система) і «Телеграм» (усе, що віддав
 * Telegram). Спільним лишається те, що справді спільне: блок імені
 * (`PlatformHandle`), два підсписки (`DatabaseSection`, `TelegramSection`) і
 * кирпичики `.wb-profile*`.
 */
export function UserProfileCard({ user, loading, error, onEdit, onMessage }: UserProfileCardProps) {
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

  // Не «чи є payload», а «чи є що показати»: у payload може лишитись саме фото,
  // яке картка не показує списком (`telegram-fields.ts`).
  const hasTelegram = hasTelegramFields(user);

  return (
    <div>
      <PlatformHandle value={user.platformUsername} />

      <ProfileIdentity user={user} />

      {hasTelegram && <TelegramSection user={user} />}

      {/*
        Telegram-поля з рядка `users` показуються лише тоді, коли збереженого
        payload немає (старі рядки, до появи `telegram_json`). Інакше ті самі
        ім'я, хендл і мова стояли б у картці двічі — а два місця для одного
        факту рано чи пізно розказують різне.
      */}
      <DatabaseSection user={user} showTelegramFields={!hasTelegram} />

      {user.rawFields && <RawFieldsSection fields={user.rawFields} />}

      <ActionsRow userId={user.id} onEdit={onEdit} onMessage={onMessage} />
    </div>
  );
}
