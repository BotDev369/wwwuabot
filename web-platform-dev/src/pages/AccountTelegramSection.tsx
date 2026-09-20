/**
 * Розділ «Телеграм» — те, що Telegram віддав про людину, **як є**.
 *
 * Даних тут менше, ніж було, і це головне рішення: людині не потрібен дамп
 * `initData` — їй потрібно впізнати себе. Тому лишились **фото, ім'я, хендл** і
 * те, що вона могла б шукати (`Мова`, `Telegram Premium`), а сирий JSON, дані
 * сеансу й внутрішній id поїхали — перше належить діагностиці (і живе в
 * адмінці), друге не означає для людини нічого.
 *
 * **Тільки читання, і це сказано словами.** Поля виглядають як поля, тож без
 * рядка знизу людина шукала б, де їх змінити; а змінюють їх у Telegram, не тут.
 *
 * @module web-platform-dev/src/pages/AccountTelegramSection
 */

import type { ReactElement } from "react";
import {
  UserProfileField,
  accountInitial,
  telegramHandle,
  telegramIsPremium,
  telegramLanguage,
  telegramName,
  telegramPhoto,
  type UserProfileData,
} from "@wwwuabot/shared";

export function AccountTelegramSection({ user }: { user: UserProfileData }): ReactElement {
  const name = telegramName(user);
  const handle = telegramHandle(user);
  const photo = telegramPhoto(user);

  // Рядки збираються, а не розписані в розмітці: порожній рядок з «—» гірший за
  // його відсутність — «Мова: —» читалось би як наша недоробка, а не як те, що
  // Telegram її не віддав.
  const rows: Array<{ label: string; value: string }> = [];
  const language = telegramLanguage(user);
  if (language) rows.push({ label: "Мова", value: language });
  if (telegramIsPremium(user)) rows.push({ label: "Telegram Premium", value: "Так" });

  return (
    <section className="wb-profile">
      <div className="wb-account-head">
        <span className="wb-account-photo wb-account-photo--lg">
          {photo ? (
            <img src={photo} alt="Фото Telegram" />
          ) : (
            <span className="wb-account-initial">{accountInitial(user, name)}</span>
          )}
        </span>
        <span className="wb-account-head-text">
          <span className="wb-account-head-title">{name ?? "Ім'я не вказано"}</span>
          {handle && <span className="wb-account-head-note">{handle}</span>}
        </span>
      </div>

      {rows.length > 0 && (
        <div className="wb-profile-fields">
          {rows.map((row) => (
            <UserProfileField key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      )}

      <p className="wb-profile-note">Ці дані дає Telegram — тут їх не змінити.</p>
    </section>
  );
}
