/**
 * Картка оголошення на дошці.
 *
 * **Це не кнопка.** Картка оголошення нікуди не веде: усе, що про нього можна
 * сказати, стоїть на ній самій, а дії бувають лише свої (змінити, прибрати з
 * дошки, видалити) — вкладені кнопки в кнопці не працюють ні на тачі, ні для
 * читача з екрана. Тому дії стоять у **своїй поверхні**, а не в тілі картки.
 *
 * **Дії живуть за «трьома крапками».** Три підписи під кожним оголошенням
 * забирали стільки ж місця, скільки його текст (і це в стрічці, яку читають);
 * «⋮» у шапці звільняє той рядок цілком і лишає картці тільки її зміст.
 * Поверхня — та сама спільна, що в решти виборів (`MenuModal`): випадних
 * списків у продукті немає (§4), бо на тачі вони промахуються повз палець.
 *
 * **Кнопка є лише під своїм.** Чуже оголошення читають; редагувати його не
 * можна — і сервер теж відповість 404, бо власник стоїть у `WHERE`. «⋮» над
 * чужим була б обіцянкою, а не дією (§7).
 *
 * **Чернетка каже, що вона чернетка.** Позначка стоїть на картці, бо вимкнене
 * оголошення в списку нічим не відрізнялось би від показаного — а різниця
 * велика: його ніхто, крім власника, не бачить.
 *
 * @module web-platform-dev/src/pages/AdCard
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { adKindLabel, type Ad } from "@wwwuabot/shared/ads";
import { MenuModal, type MenuItem } from "@wwwuabot/ui/menu";

export function AdCard({
  ad,
  mine,
  onEdit,
  onToggle,
  onDelete,
}: {
  ad: Ad;
  mine: boolean;
  onEdit: () => void;
  /** Показати або прибрати з дошки — один дотик на обидва стани. */
  onToggle: () => void;
  onDelete: () => void;
}): ReactElement {
  const [menu, setMenu] = useState(false);
  const meta = [ad.price, ad.place].filter((part) => part.trim() !== "");

  /**
   * Пункти дій. Дотик **закриває поверхню** — інакше після дії вона лишалась би
   * висіти над карткою, і здавалося б, що нічого не сталось (та сама причина,
   * що в пікерах смуги керування).
   */
  function actions(): MenuItem[] {
    return [
      {
        key: "edit",
        label: "Змінити",
        icon: "edit",
        onSelect: () => {
          setMenu(false);
          onEdit();
        },
      },
      {
        key: "toggle",
        label: ad.isActive ? "Прибрати з дошки" : "Показати на дошці",
        icon: ad.isActive ? "eye-off" : "eye",
        onSelect: () => {
          setMenu(false);
          onToggle();
        },
      },
      {
        key: "delete",
        label: "Видалити",
        icon: "trash",
        onSelect: () => {
          setMenu(false);
          onDelete();
        },
      },
    ];
  }

  return (
    <article className="wb-ad">
      <div className="wb-ad-head">
        <span className="wb-ad-kind">{adKindLabel(ad.kind)}</span>
        {!ad.isActive && <span className="wb-ad-draft">Чернетка</span>}

        {mine && (
          <button
            type="button"
            className="wb-ad-menu"
            aria-label="Дії з оголошенням"
            aria-haspopup="menu"
            title="Дії з оголошенням"
            onClick={() => setMenu(true)}
          >
            <Icon name="more" size={18} />
          </button>
        )}
      </div>

      {ad.title && <h3 className="wb-ad-title">{ad.title}</h3>}
      {meta.length > 0 && <div className="wb-ad-meta">{meta.join(" · ")}</div>}
      {ad.body && <p className="wb-ad-body">{ad.body}</p>}

      {menu && (
        <MenuModal
          /* Ім'я оголошення в шапці поверхні: дії завжди стосуються **одного**
             рядка, і без цього доводилось би згадувати, якого саме. */
          title={ad.title || "Оголошення"}
          items={actions()}
          onClose={() => setMenu(false)}
        />
      )}
    </article>
  );
}
