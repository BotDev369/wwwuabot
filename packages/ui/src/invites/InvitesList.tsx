/**
 * Список контактів — картки з особистим посиланням.
 *
 * Контакт не заводять руками: він з'являється з посилання, і посилання ж
 * лишається **в самій картці** — щоб надіслати його ще раз, не шукаючи цього
 * рядка деінде. Тому картка показує рівно чотири речі: **підпис** (кому вона
 * призначена), **стан** (очікує чи вже приєднався), **саме посилання** й дві
 * дії.
 *
 * **Стан — словом, а не самим кольором:** «Очікує»/«Приєднався» видно без
 * розрізнення відтінків, а колір лише підсилює те, що вже сказано. Це та сама
 * межа, що в тегах нотаток: приглушеність робить колір, а не розмір.
 *
 * Дії картка **не робить сама** — вона віддає лінк нагору (`onCopy`,
 * `onDelete`): підтвердження видалення й доступ до буфера обміну знає оболонка,
 * а не картка. Так само зроблено в нотатках.
 *
 * Розмітка — кирпичики `.wb-invite*`: їх рендерить спільний код, тож стилі
 * живуть у `packages/shared/src/styles/` (правило 10).
 *
 * @module @wwwuabot/ui/invites
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { formatStamp } from "@wwwuabot/shared/utils/datetime";
import type { InviteLink } from "@wwwuabot/shared/invites";

interface InvitesListProps {
  links: readonly InviteLink[];
  /**
   * Номер лінка, який щойно скопіювали.
   *
   * Це не стан картки, а **відповідь на дію**: дотик до «Копіювати» мусить
   * щось сказати, інакше незрозуміло, чи лінк у буфері. Тримає його оболонка
   * (вона ж прибирає позначку за таймером), а список лише малює.
   */
  copiedId?: number | null;
  /** Скопіювати лінк — оболонка сама вирішує, як і що сказати при невдачі. */
  onCopy: (link: InviteLink) => void;
  /** Прибрати лінк — оболонка питає підтвердження сама. */
  onDelete: (link: InviteLink) => void;
}

/** Підпис лінка: людина його задала — інакше місце лишалось би порожнім. */
function label(link: InviteLink): string {
  return link.label.trim() || "Без підпису";
}

function InviteCard({
  link,
  copied,
  onCopy,
  onDelete,
}: {
  link: InviteLink;
  copied: boolean;
  onCopy: (link: InviteLink) => void;
  onDelete: (link: InviteLink) => void;
}): ReactElement {
  const contact = link.contact;

  return (
    <li className="wb-invite-item">
      <div className="wb-invite-card">
        <div className="wb-invite-head">
          <span className="wb-invite-label">{label(link)}</span>
          <span className={`wb-invite-state wb-invite-state--${contact ? "joined" : "waiting"}`}>
            {contact ? "Приєднався" : "Очікує"}
          </span>
        </div>

        {/* Хто прийшов — ім'я з підписаного профілю, а не те, що вписав
            власник: саме воно показує, що лінк справді спрацював. */}
        {contact && (
          <p className="wb-invite-contact">
            <Icon name="user" size={14} />
            {contact.name}
            <span className="wb-invite-stamp">{formatStamp(contact.joinedAt)}</span>
          </p>
        )}

        <code className="wb-invite-code">
          {link.deepLink ?? `${link.code} — лінк не скласти: невідоме ім'я бота`}
        </code>

        <div className="wb-invite-actions">
          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            onClick={() => onCopy(link)}
            // Кнопка без лінка не робить нічого: замість тихого кліку — чесне
            // «поки нічого».
            disabled={!link.deepLink}
          >
            <Icon name={copied ? "check" : "copy"} size={16} />
            {copied ? "Скопійовано" : "Копіювати"}
          </button>
          <button
            type="button"
            className="wb-btn wb-btn-secondary wb-btn-danger"
            onClick={() => onDelete(link)}
          >
            <Icon name="trash" size={16} />
            Прибрати
          </button>
        </div>
      </div>
    </li>
  );
}

export function InvitesList({ links, copiedId, onCopy, onDelete }: InvitesListProps): ReactElement {
  return (
    <ul className="wb-invite-list">
      {links.map((link) => (
        <InviteCard
          key={link.id}
          link={link}
          copied={copiedId === link.id}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
