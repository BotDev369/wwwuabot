/**
 * Розділ «Телеграм» — те, що Telegram віддав про людину, **як є**, і що з цього
 * вона показує іншим.
 *
 * Перший блок — один погляд на Telegram: фото, повне ім'я (`first_name` +
 * `last_name`), `@юзернейм` і кожне поле, яке прийшло в payload — зокрема те,
 * якого ми ще не знаємо. Людина мусить упізнати себе цілком, а не половину, і
 * саме тому шапка не живе окремою карткою (`TelegramSection`).
 *
 * **Публічність — окремою карткою під нею.** Це не дані Telegram, а вибір
 * людини, тож і картка своя: заголовок називає її, а перемикачі під ним
 * показуються лише тоді, коли профіль уже відкрито (`PublicProfileControls`).
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

import { useState, type ReactElement } from "react";
import {
  DEFAULT_OPEN_FIELDS,
  PublicProfileControls,
  UserProfileSection,
  UserTelegramDataSection,
  type PublicProfileChange,
  type UserProfileData,
} from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";

export function AccountTelegramSection({
  user,
  onChangeVisibility,
}: {
  user: UserProfileData;
  onChangeVisibility: (next: PublicProfileChange) => Promise<string | null>;
}): ReactElement {
  const dialog = useDialog();
  // Перемикачі показують стан **після** відповіді сервера: увімкнений прапорець,
  // який не зберігся, обіцяв би відкритий профіль, якого немає.
  const [saving, setSaving] = useState(false);

  async function changeVisibility(next: PublicProfileChange): Promise<void> {
    setSaving(true);
    const failure = await onChangeVisibility(next);
    setSaving(false);
    if (failure) void dialog.alert(failure, { tone: "danger", title: "Не збереглося" });
  }

  return (
    <>
      <UserTelegramDataSection user={user} />

      <UserProfileSection title="Публічність" icon="eye">
        <PublicProfileControls
          isPublic={user.isPublic === true}
          openFields={user.openFields ?? DEFAULT_OPEN_FIELDS}
          disabled={saving}
          onChange={(next) => void changeVisibility(next)}
        />
      </UserProfileSection>
    </>
  );
}
