/**
 * Розділ «Телеграм» — те, що Telegram віддав про людину, **як є**.
 *
 * Це половина колишньої картки акаунта, і саме тому тут показується **все**:
 * фото, повне ім'я (`first_name` + `last_name`), хендл і кожне поле, яке
 * прийшло в payload — зокрема те, якого ми ще не знаємо. Людина мусить упізнати
 * себе цілком, а не половину.
 *
 * **Порожньо — `...`, а не пропуск.** Хендла може не бути, і тоді другий рядок
 * шапки стоїть на своєму місці з `...`: рядок, що зникає, читався б як
 * «поламалось», а не як «його справді немає».
 *
 * **Словами — тільки те, чого не видно з полів, і перед карткою.** Рядок «ці
 * дані дає Telegram» стоїть **угорі**: людина має знати, чому тут немає кнопки,
 * ще до того, як почне її шукати під полями. Дані сеансу й сирий JSON, які
 * стояли тут для відловлювання багів, прибрано — це наш дамп, не профіль.
 *
 * @module web-platform-dev/src/pages/AccountTelegramSection
 */

import type { ReactElement } from "react";
import {
  AccountAvatar,
  UserTelegramDataSection,
  accountInitial,
  telegramHandle,
  telegramName,
  telegramPhoto,
  type UserProfileData,
} from "@wwwuabot/shared";

/** Порожнє місце в шапці лишається на своєму місці — з `...`. */
const EMPTY = "...";

export function AccountTelegramSection({ user }: { user: UserProfileData }): ReactElement {
  // Ім'я тут справжнє, а `...` — лише в підписі: літера в крузі береться з
  // імені, і крапка від `...` читалась би як чужий аватар.
  const name = telegramName(user);
  const handle = telegramHandle(user);
  const photo = telegramPhoto(user);

  return (
    <>
      <p className="wb-profile-note">Ці дані дає Telegram — тут їх не змінити.</p>

      <section className="wb-profile">
        <div className="wb-account-head">
          <AccountAvatar photo={photo} initial={accountInitial(user, name)} alt="Фото Telegram" />
          <span className="wb-account-head-text">
            <span className="wb-account-head-title">{name ?? EMPTY}</span>
            <span className="wb-account-head-note">{handle ?? EMPTY}</span>
          </span>
        </div>
      </section>

      {/* Шапка — впізнавання з першого погляду; список нижче нею не вкорочується. */}
      <UserTelegramDataSection user={user} />
    </>
  );
}
