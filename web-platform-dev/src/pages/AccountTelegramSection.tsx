/**
 * Розділ «Телеграм» — те, що Telegram віддав про людину, **як є**.
 *
 * Це половина колишньої картки акаунта, і саме тому тут показується **все**:
 * фото, ім'я, хендл і кожне поле, яке прийшло в payload (зокрема те, якого ми
 * ще не знаємо), плюс дані сеансу й сирий JSON — під згорткою, бо потрібні вони
 * рідко, але потрібні. Людина мусить упізнати себе цілком, а не половину.
 *
 * Сирі значення — не «технічні подробиці», а єдине, що можна показати, коли
 * Telegram додав поле, якого ми не знаємо: невідомий ключ видно своїм ім'ям.
 *
 * **Словами — тільки те, чого не видно з полів.** Поля виглядають як поля, тож
 * без рядка знизу людина шукала б, де їх змінити; а змінюють їх у Telegram, не
 * тут.
 *
 * @module web-platform-dev/src/pages/AccountTelegramSection
 */

import type { ReactElement } from "react";
import {
  AccountAvatar,
  TELEGRAM_HEAD_KEYS,
  UserTelegramDataSection,
  accountInitial,
  telegramHandle,
  telegramName,
  telegramPhoto,
  type UserProfileData,
} from "@wwwuabot/shared";

export function AccountTelegramSection({ user }: { user: UserProfileData }): ReactElement {
  const name = telegramName(user);
  const handle = telegramHandle(user);
  const photo = telegramPhoto(user);

  return (
    <>
      <section className="wb-profile">
        <div className="wb-account-head">
          <AccountAvatar photo={photo} initial={accountInitial(user, name)} alt="Фото Telegram" />
          <span className="wb-account-head-text">
            <span className="wb-account-head-title">{name ?? "Ім'я не вказано"}</span>
            {handle && <span className="wb-account-head-note">{handle}</span>}
          </span>
        </div>
      </section>

      {/* Шапка вже показала фото, ім'я й хендл — у списку вони зайві. */}
      <UserTelegramDataSection user={user} omit={TELEGRAM_HEAD_KEYS} />

      <p className="wb-profile-note">Ці дані дає Telegram — тут їх не змінити.</p>
    </>
  );
}
