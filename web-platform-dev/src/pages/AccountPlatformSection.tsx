/**
 * Розділ «Платформа» — наш акаунт: **як вас бачать інші** і що про вас знає
 * система.
 *
 * **Одна картка на все про себе.** Ім'я, фото, «Про себе» й дані акаунта
 * (роль, тариф, статус, знижка, права, блокування) — це «я на платформі», тож і
 * картка одна: «Дані на платформі». Дві картки ділили б один факт навпіл і
 * змушували б людину шукати різницю там, де її немає (AGENTS.md §7).
 *
 * **Публічність — усередині тієї ж картки.** Перемикач «Публічний профіль» — це
 * теж про мене, і саме тому він стоїть **після** полів, які відкриває: спершу
 * людина бачить, що в неї є, а вже потім вирішує, що з цього показати. Поля під
 * ним — ті самі, що стоять вище; це не друга картка, а керування першою.
 *
 * **Слів над карткою немає.** Порожній круг із літерою каже «ще не додано» сам,
 * а кнопка «Обрати» — що робити.
 *
 * @module web-platform-dev/src/pages/AccountPlatformSection
 */

import { useState, type ReactElement } from "react";
import {
  AboutField,
  AccountAvatar,
  DEFAULT_OPEN_FIELDS,
  PlatformHandle,
  PublicProfileControls,
  UserProfileDataSection,
  UserProfileSection,
  accountInitial,
  platformLabel,
  platformPhoto,
  type PublicProfileChange,
  type UserProfileData,
} from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";

export function AccountPlatformSection({
  user,
  onChangeUsername,
  onChangeAbout,
  onChangeVisibility,
}: {
  user: UserProfileData;
  onChangeUsername: (value: string) => Promise<string | null>;
  onChangeAbout: (value: string) => Promise<string | null>;
  onChangeVisibility: (next: PublicProfileChange) => Promise<string | null>;
}): ReactElement {
  const dialog = useDialog();
  const name = platformLabel(user);
  const photo = platformPhoto(user);
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

      <PublicProfileControls
        isPublic={user.isPublic === true}
        openFields={user.openFields ?? DEFAULT_OPEN_FIELDS}
        disabled={saving}
        onChange={(next) => void changeVisibility(next)}
      />
    </UserProfileSection>
  );
}
