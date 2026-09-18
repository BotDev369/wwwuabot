/**
 * Дві облікові картки над списком меню профілю: **Telegram і портал**.
 *
 * Раніше тут був один рядок «ім'я + хендл», і він брехав рівно тим, що
 * змішував два джерела: підпис «@karas» однаково читався і як ім'я людини на
 * wwwuabot, і як Telegram-хендл, хоч це різні речі (AGENTS.md §2). Тепер
 * кожне поле стоїть на своїй картці, і підпис картки каже, звідки воно.
 *
 * Друга причина поділу — місце. У цьому меню картки **єдине**, що росте:
 * плитки фіксовані, тож порожнеча під заголовком дісталась саме їм, і після
 * поділу на дві вони заповнюють її повністю (`.wb-menu-account`).
 *
 * Дотик веде на повний екран (`/profile`) — список лишається навігацією по
 * розділах, а не місцем для форми. Дані бере той самий хук, що й сторінка
 * профілю (`useProfile`): ідентичність приходить із підписаного `initData` на
 * сервері, тож клієнт не передає жодного `user_id`.
 *
 * @module web-platform-dev/src/layout/ProfileAccountCards
 */

import type { ReactElement } from "react";
import { Icon, type UserProfileData } from "@wwwuabot/shared";
import {
  avatarInitial,
  joinedLine,
  platformHandle,
  telegramHandle,
  telegramName,
} from "./profile-account";

interface ProfileAccountCardsProps {
  user: UserProfileData | null;
  loading: boolean;
  /** Відкрити повний екран профілю. */
  onOpen: () => void;
}

export function ProfileAccountCards({
  user,
  loading,
  onOpen,
}: ProfileAccountCardsProps): ReactElement {
  const name = telegramName(user);
  const handle = telegramHandle(user);
  const platform = platformHandle(user);
  const joined = joinedLine(user);

  return (
    <div className="wb-menu-account">
      <button
        type="button"
        className="wb-menu-account-card"
        onClick={onOpen}
        // Підпис кнопки називає і картку, і людину: два дотики ведуть на той
        // самий екран, тож без назви картки скрінрідер бачив би їх однаковими.
        aria-label={loading ? "Профіль" : `Профіль: ім'я в Telegram — ${name ?? "без імені"}`}
      >
        <span className="wb-menu-account-label">Telegram</span>
        <span className="wb-menu-account-avatar">
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt="" />
          ) : (
            // Літера замість фото: порожнє коло нічого не читає, а літера
            // каже, чиї це дані — так само, як у картці профілю.
            <span className="wb-menu-account-initial">{avatarInitial(user)}</span>
          )}
        </span>
        <span className="wb-menu-account-name">
          {loading ? "Завантаження…" : (name ?? "Імені немає")}
        </span>
        {/* Поки даних немає, про хендл не кажемо нічого: «без хендла» під час
            завантаження — це вже твердження, і воно хибне. */}
        {!loading && <span className="wb-menu-account-sub">{handle ?? "без хендла"}</span>}
      </button>

      <button
        type="button"
        className="wb-menu-account-card"
        onClick={onOpen}
        aria-label={loading ? "Профіль" : `Профіль: ім'я на платформі — ${platform ?? "не задано"}`}
      >
        <span className="wb-menu-account-label">Портал</span>
        <span className="wb-menu-account-avatar">
          <Icon name="user" size={26} />
        </span>
        <span className="wb-menu-account-name">
          {loading ? "Завантаження…" : (platform ?? "Ім'я не задано")}
        </span>
        <span className="wb-menu-account-sub">{joined ?? "Натисніть, щоб змінити"}</span>
      </button>
    </div>
  );
}
