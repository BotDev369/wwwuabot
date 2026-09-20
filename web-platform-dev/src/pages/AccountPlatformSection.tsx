/**
 * Розділ «Платформа» — наш акаунт: **як вас бачать інші** і що про вас знає
 * система.
 *
 * **Одна картка на фото й ім'я.** Інші бачать їх разом, тож і порада під ними
 * одна — «так вас бачать інші» стосується і фото, і імені. Розділені на два
 * блоки, вони казали б одне й те саме двічі, і людина шукала б різницю там, де
 * її немає (AGENTS.md §7: один факт — одне місце).
 *
 * **Фото поки немає — і про це сказано словами, на початку розділу.** Порожній
 * круг без пояснення читався б як поламане зображення, а не як «ще не додано».
 * Один короткий рядок, без лекцій: решту каже сама картка. Стоїть він першим,
 * як і пояснення в розділі «Телеграм», — обидва розділи починаються однаково.
 *
 * **Дані акаунта — після імені.** Роль, тариф, статус, знижка, права й
 * блокування — те, що людина має бачити про себе: інакше «чому мені щось
 * недоступно» лишається здогадом. Показує їх той самий компонент, що в картці
 * адмінки, — інший список розійшовся б із ним на першій же правці.
 *
 * @module web-platform-dev/src/pages/AccountPlatformSection
 */

import type { ReactElement } from "react";
import {
  AccountAvatar,
  PlatformHandle,
  UserProfileDataSection,
  accountInitial,
  platformLabel,
  platformPhoto,
  type UserProfileData,
} from "@wwwuabot/shared";

export function AccountPlatformSection({
  user,
  onChangeUsername,
}: {
  user: UserProfileData;
  onChangeUsername: (value: string) => Promise<string | null>;
}): ReactElement {
  const name = platformLabel(user);
  const photo = platformPhoto(user);

  return (
    <>
      {!photo && <p className="wb-profile-note">Своє фото можна буде додати трохи згодом.</p>}

      <PlatformHandle
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

      <UserProfileDataSection user={user} showTelegramFields={false} title="Дані акаунта" />
    </>
  );
}
