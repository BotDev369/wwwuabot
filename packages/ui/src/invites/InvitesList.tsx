/**
 * Список контактів — картки з особистим посиланням.
 *
 * Контакт не заводять руками: він з'являється з посилання, і посилання ж
 * лишається **в самій картці** — щоб надіслати його ще раз, не шукаючи цього
 * рядка деінде. Тому картка показує рівно чотири речі: **підпис зі своєю
 * правкою** (кому вона призначена), **стан** (очікує чи вже приєднався),
 * **саме посилання** й дві дії над ним.
 *
 * **Правка стоїть біля імені, а не в ряду дій.** Олівець стосується підпису — і
 * стоїть там, де підпис; у ряду `Копіювати / Прибрати` він читався б як третя
 * дія над посиланням, а третя кнопка в тому ряду на телефоні ще й розривається
 * ([DESIGN_SYSTEM.md](../../../../docs/DESIGN_SYSTEM.md) — та сама межа, що в
 * трьох кнопок панелі теми).
 *
 * **Стан — словом, а не самим кольором:** «Очікує»/«Приєднався» видно без
 * розрізнення відтінків, а колір лише підсилює те, що вже сказано. Це та сама
 * межа, що в тегах нотаток: приглушеність робить колір, а не розмір.
 *
 * Дії картка **не робить сама** — вона віддає контакт нагору (`onCopy`,
 * `onRename`, `onDelete`): підтвердження видалення, питання імені й доступ до
 * буфера обміну знає оболонка, а не картка. Так само зроблено в нотатках.
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
  /** Перейменувати контакт — ім'я питає оболонка (картка не має діалогу). */
  onRename: (link: InviteLink) => void;
  /** Прибрати контакт — оболонка питає підтвердження сама. */
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
  onRename,
  onDelete,
}: {
  link: InviteLink;
  copied: boolean;
  onCopy: (link: InviteLink) => void;
  onRename: (link: InviteLink) => void;
  onDelete: (link: InviteLink) => void;
}): ReactElement {
  const contact = link.contact;
  const name = label(link);

  return (
    <li className="wb-invite-item">
      <div className="wb-invite-card">
        <div className="wb-invite-head">
          <span className="wb-invite-title">
            <span className="wb-invite-label">{name}</span>
            {/* Клітинка без підпису, тож ім'я контакту читає `aria-label`:
                «Перейменувати контакт «Карас»» — інакше скрінрідер сказав би
                просто «кнопка». */}
            <button
              type="button"
              className="wb-invite-edit"
              onClick={() => onRename(link)}
              aria-label={`Перейменувати контакт «${name}»`}
            >
              <Icon name="edit" size={16} />
            </button>
          </span>
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

export function InvitesList({
  links,
  copiedId,
  onCopy,
  onRename,
  onDelete,
}: InvitesListProps): ReactElement {
  return (
    <ul className="wb-invite-list">
      {links.map((link) => (
        <InviteCard
          key={link.id}
          link={link}
          copied={copiedId === link.id}
          onCopy={onCopy}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
