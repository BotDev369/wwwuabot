/**
 * Картка «хто ти» над списком меню профілю.
 *
 * Це не пункт меню, а сам профіль: ім'я, хендл і аватар — тобто те, що людина
 * хоче впізнати першим, ще до списку розділів. Дотик веде на повний екран
 * (`/profile`), де ім'я на платформі можна змінити: список — це навігація по
 * розділах, а не місце для форми.
 *
 * Дані бере той самий хук, що й сторінка профілю (`useProfile`): ідентичність
 * приходить із підписаного `initData` на сервері, тож клієнт не передає
 * жодного `user_id` і не може попросити чуже ім'я.
 *
 * @module web-platform-dev/src/layout/ProfileIdentityRow
 */

import type { ReactElement } from "react";
import type { UserProfileData } from "@wwwuabot/shared";

interface ProfileIdentityRowProps {
  user: UserProfileData | null;
  loading: boolean;
  /** Відкрити повний екран профілю. */
  onOpen: () => void;
}

/** Підпис під іменем: спершу ім'я на платформі, далі — Telegram-хендл. */
function handleOf(user: UserProfileData | null): string | null {
  const name = user?.platformUsername ?? user?.username;
  return name ? `@${name}` : null;
}

export function ProfileIdentityRow({
  user,
  loading,
  onOpen,
}: ProfileIdentityRowProps): ReactElement {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const handle = handleOf(user);
  const initial = (user?.firstName ?? "").trim().charAt(0).toUpperCase();

  return (
    <button
      type="button"
      className="wb-menu-ident"
      onClick={onOpen}
      // Підпис кнопки — те, що видно: ім'я й хендл. Поки даних немає, сказано
      // прямо, що буде всередині, а не лишається порожня кнопка.
      aria-label={loading ? "Профіль" : `Профіль: ${fullName || handle || "відкрити"}`}
    >
      <span className="wb-menu-ident-avatar">
        {user?.photoUrl ? (
          <img src={user.photoUrl} alt="" />
        ) : (
          // Літера замість фото — як у картці профілю: порожнє коло з ничого
          // не читається, а літера каже, чиї це дані.
          <span className="wb-menu-ident-initial">{initial || "?"}</span>
        )}
      </span>
      <span className="wb-menu-ident-text">
        <span className="wb-menu-ident-name">
          {loading ? "Завантаження…" : fullName || "Профіль"}
        </span>
        {handle && <span className="wb-menu-ident-handle">{handle}</span>}
        {!loading && !handle && <span className="wb-menu-ident-handle">Ім'я та дані</span>}
      </span>
    </button>
  );
}
