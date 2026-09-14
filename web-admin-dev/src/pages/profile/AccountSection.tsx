/**
 * Обліковий запис панелі.
 *
 * Панель входить **паролем** (`POST /auth/login` → cookie `admin_session`), а
 * не через Telegram, тож «свого» Telegram-профілю в неї не існує — і
 * вигадувати його не можна. Тут чесно показано те, що справді є: спосіб
 * входу, роль і термін дії сесії. Профіль конкретної людини — окремий розділ
 * нижче, і він той самий, що бачить людина в Telegram.
 *
 * @module web-admin-dev/src/pages/profile/AccountSection
 */

import type { ReactElement } from "react";
import { Icon, UserProfileField } from "@wwwuabot/shared";
import { useAdminAccount } from "./useAdminAccount";
import { formatSessionExpiry } from "./session-format";

export function AccountSection(): ReactElement {
  const { session, loading, error } = useAdminAccount();

  const expiry = loading
    ? "перевіряємо…"
    : error
      ? "не вдалося прочитати"
      : formatSessionExpiry(session?.expiresAt ?? null);

  return (
    <section className="wb-profile">
      <h2 className="wb-profile-title">
        <Icon name="user" size={16} />
        <span>Акаунт панелі</span>
      </h2>

      <div className="wb-profile-fields">
        <UserProfileField label="Вхід" value="Пароль адмінки" />
        <UserProfileField label="Роль" value="Адмін" />
        <UserProfileField label="Сесія діє" value={expiry} />
      </div>

      <p className="wb-profile-note">
        Панель входять за паролем, а не через Telegram, тому власних Telegram-даних тут немає.
        Профіль людини — той самий екран, що й у застосунку — відкривається нижче.
      </p>
    </section>
  );
}
