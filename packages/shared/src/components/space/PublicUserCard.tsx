import type { ReactElement } from "react";
import { Icon } from "../Icon";
import {
  isEmptyPublicProfile,
  publicProfileLabel,
  type PublicProfile,
} from "../../user/public-profile";

/**
 * Картка людини в Просторі — те, що видно **іншим**.
 *
 * **Тут немає нічого, крім відкритих полів.** Компонент не має доступу до
 * Telegram-даних узагалі: у `PublicProfile` їх немає за типом, тож показати
 * чужий `@username` чи аватар Telegram не вийде навіть випадково. Це і є
 * причина окремого типу, а не позиченого `UserProfileData` (AGENTS.md §2).
 *
 * **Ім'я без `#`, коли його закрито.** Замість порожнього місця картка чесно
 * каже, що показувати нічого: людина не мусить вгадувати, чи профіль
 * поламався, чи її справді не видно.
 *
 * **`onSelect` робить картку кнопкою.** У стрічці за нею стоїть сторінка
 * людини, тож це дотик на всю ширину; на самій сторінці картка лишається
 * карткою — кнопка, яка нікуди не веде, обіцяла б перехід.
 */
export function PublicUserCard({
  profile,
  full = false,
  onSelect,
}: {
  profile: PublicProfile;
  /** Повний текст «Про себе» — на сторінці людини; у стрічці він стиснутий. */
  full?: boolean;
  onSelect?: () => void;
}): ReactElement {
  const label = publicProfileLabel(profile);
  const initial = (label ?? "?").replace(/^#/u, "").charAt(0).toUpperCase() || "?";
  const empty = isEmptyPublicProfile(profile);

  // Дані акаунта — одним рядком: це довідка про людину, а не її підпис, і
  // окремі рядки на кожне поле розтягнули б картку на пів екрана.
  const facts = [profile.role, profile.tariff, profile.status, profile.language].filter(
    (fact): fact is string => Boolean(fact),
  );

  const body = (
    <>
      <span className="wb-person-photo">
        {profile.photoUrl ? (
          <img src={profile.photoUrl} alt={label ?? "Фото"} />
        ) : (
          <span className="wb-person-initial">{initial}</span>
        )}
      </span>

      <span className="wb-person-body">
        <span className="wb-person-name">
          {label ?? (empty ? "Без публічних даних" : "Ім'я приховано")}
        </span>
        {profile.about && <span className="wb-person-about">{profile.about}</span>}
        {facts.length > 0 && <span className="wb-person-facts">{facts.join(" · ")}</span>}
        {profile.createdAt && <span className="wb-person-facts">З нами з {profile.createdAt}</span>}
      </span>

      {onSelect && (
        <span className="wb-person-more">
          <Icon name="chevron-right" size={18} />
        </span>
      )}
    </>
  );

  const className = `wb-person${full ? " wb-person--full" : ""}${
    onSelect ? " wb-person--tappable" : ""
  }`;

  if (onSelect) {
    return (
      <button type="button" className={className} onClick={onSelect}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
