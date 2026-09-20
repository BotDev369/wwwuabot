import { AccountAvatar } from "./user-profile/AccountAvatar";
import { ActionsRow } from "./user-profile/ActionsRow";
import { DatabaseSection } from "./user-profile/DatabaseSection";
import { PlatformHandle } from "./user-profile/PlatformHandle";
import { RawFieldsSection } from "./user-profile/RawFieldsSection";
import { TelegramSection } from "./user-profile/TelegramSection";
import { accountInitial, platformPhoto, telegramPhoto } from "./user-profile/account";
import { hasTelegramFields } from "./user-profile/telegram-fields";
import type { UserProfileCardProps, UserProfileData } from "./user-profile/types";

export type { UserProfileCardProps, UserProfileData };

/**
 * Картка користувача **для адмінки**: повний рядок `users` про людину.
 *
 * Розділи, у порядку показу:
 *   1. **Ім'я на платформі** — головне ім'я людини в продукті разом з її фото
 *      (тільки читання: чуже ім'я адмін не переписує випадково);
 *   2. **дані Telegram** — один блок: фото, повне ім'я, `@юзернейм` і кожне
 *      поле payload, зокрема невідоме нам (`TelegramSection`);
 *   3. дані системи: роль, тариф, статус, знижка, права, блокування;
 *   4. сирі поля рядка — для діагностики.
 *
 * **Чому це не екран користувача.** Людина бачить себе на `/profile/account` у
 * платформі — там ті самі дані розділені на два погляди: «Платформа» (як її
 * бачать інші та що про неї знає система) і «Телеграм» (усе, що віддав
 * Telegram). Спільним лишається те, що справді спільне: блок імені
 * (`PlatformHandle`), два підсписки (`DatabaseSection`, `TelegramSection`) і
 * кирпичики `.wb-profile*`.
 *
 * **Аватар стоїть у блоці імені, а не окремим рядом.** Фото в людини одне (своє
 * на платформі, а як його ще немає — те, що дає Telegram), і другий блок з тим
 * самим іменем був би другою копією одного факту (AGENTS.md §7).
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
  // яке картка не показує рядком (`telegram-fields.ts`).
  const hasTelegram = hasTelegramFields(user);

  return (
    <div>
      <PlatformHandle
        value={user.platformUsername}
        avatar={
          <AccountAvatar
            photo={platformPhoto(user) ?? telegramPhoto(user)}
            initial={accountInitial(user)}
            alt="Фото користувача"
          />
        }
      />

      {hasTelegram && <TelegramSection user={user} />}

      {/*
        Telegram-поля з рядка `users` показуються лише тоді, коли збереженого
        payload немає (старі рядки, до появи `telegram_json`). Інакше ті самі
        ім'я, юзернейм і мова стояли б у картці двічі — а два місця для одного
        факту рано чи пізно розказують різне.
      */}
      <DatabaseSection user={user} showTelegramFields={!hasTelegram} />

      {user.rawFields && <RawFieldsSection fields={user.rawFields} />}

      <ActionsRow userId={user.id} onEdit={onEdit} onMessage={onMessage} />
    </div>
  );
}
