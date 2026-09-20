/**
 * Розділ «Телеграм» — те, що Telegram віддав про людину, **як є**.
 *
 * Це один блок і один погляд: фото, повне ім'я (`first_name` + `last_name`),
 * `@юзернейм` і кожне поле, яке прийшло в payload — зокрема те, якого ми ще не
 * знаємо. Людина мусить упізнати себе цілком, а не половину, і саме тому шапка
 * не живе окремою карткою (`TelegramSection`).
 *
 * **Джерело даних називають один раз.** Раніше тут стояв ще рядок «ці дані дає
 * Telegram» — і над карткою, у якої та сама назва на заголовку. Дві згадки про
 * одне читались як повтор, а не як пояснення: джерело називає заголовок, а те,
 * що поля незмінні, видно з того, що в них немає кнопки «Змінити» (у розділі
 * «Платформа» вона є). Дані сеансу й сирий JSON, які стояли тут для
 * відловлювання багів, прибрано — це наш дамп, не профіль.
 *
 * @module web-platform-dev/src/pages/AccountTelegramSection
 */

import type { ReactElement } from "react";
import { UserTelegramDataSection, type UserProfileData } from "@wwwuabot/shared";

export function AccountTelegramSection({ user }: { user: UserProfileData }): ReactElement {
  return <UserTelegramDataSection user={user} />;
}
