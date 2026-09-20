/**
 * Розділ «Телеграм» — те, що Telegram віддав про людину, **як є**.
 *
 * Це один блок і один погляд: фото, повне ім'я (`first_name` + `last_name`),
 * `@юзернейм` і кожне поле, яке прийшло в payload — зокрема те, якого ми ще не
 * знаємо. Людина мусить упізнати себе цілком, а не половину, і саме тому
 * шапка не живе окремою карткою (`TelegramSection`).
 *
 * **Словами — тільки те, чого не видно з полів, і перед карткою.** Рядок «ці
 * дані дає Telegram» стоїть **угорі**: людина має знати, чому тут немає кнопки,
 * ще до того, як почне її шукати під полями. Дані сеансу й сирий JSON, які
 * стояли тут для відловлювання багів, прибрано — це наш дамп, не профіль.
 *
 * @module web-platform-dev/src/pages/AccountTelegramSection
 */

import type { ReactElement } from "react";
import { UserTelegramDataSection, type UserProfileData } from "@wwwuabot/shared";

export function AccountTelegramSection({ user }: { user: UserProfileData }): ReactElement {
  return (
    <>
      <p className="wb-profile-note">Ці дані дає Telegram — тут їх не змінити.</p>
      <UserTelegramDataSection user={user} />
    </>
  );
}
