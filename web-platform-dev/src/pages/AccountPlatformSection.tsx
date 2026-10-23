/**
 * Розділ «Платформа» — наш акаунт: ім'я, фото й те, що про людину знає
 * система.
 *
 * **Одна картка на все про себе.** Ім'я, фото, «Про себе» й дані акаунта
 * (роль, тариф, статус, знижка, права, блокування) — це «я на платформі», тож і
 * картка одна: «Дані на платформі». Дві картки ділили б один факт навпіл і
 * змушували б людину шукати різницю там, де її немає (AGENTS.md §7).
 *
 * **Публічності тут немає** — вона в розділі «Телеграм», окремою карткою під
 * даними Telegram (`AccountTelegramSection`): це вибір, що показати іншим, і
 * він стоїть поруч із тим, що Telegram уже показав про людину.
 *
 * **Слів над карткою немає.** Порожній круг із літерою каже «ще не додано» сам,
 * а кнопка «Обрати» — що робити.
 *
 * @module web-platform-dev/src/pages/AccountPlatformSection
 */

import type { ReactElement } from "react";
import {
  AboutField,
  AccountAvatar,
  PlatformHandle,
  UserProfileDataSection,
  UserProfileSection,
  accountInitial,
  platformLabel,
  platformPhoto,
  type UserProfileData,
} from "@wwwuabot/shared";

export function AccountPlatformSection({
  user,
  onChangeUsername,
  onChangeAbout,
}: {
  user: UserProfileData;
  onChangeUsername: (value: string) => Promise<string | null>;
  onChangeAbout: (value: string) => Promise<string | null>;
}): ReactElement {
  const name = platformLabel(user);
  const photo = platformPhoto(user);

  return (
    /* Картку дає саме розділ, а не підсписки: ім'я, «Про себе» й дані акаунта —
       одна картка, тож жоден із них не малює власної (`plain`). */
    <UserProfileSection title="Дані на платформі" icon="clipboard">
      <PlatformHandle
        plain
        value={user.platformUsername}
        onSubmit={onChangeUsername}
        avatar={
          <AccountAvatar
            photo={photo}
            initial={accountInitial(user, name)}
            alt="Фото на платформі"
          />
        }
      />

      <AboutField value={user.about} onSubmit={onChangeAbout} />

      <UserProfileDataSection plain user={user} showTelegramFields={false} />
    </UserProfileSection>
  );
}
