/**
 * Плитка товару — **один вигляд картки** для вітрини й сітки сторінки.
 *
 * Картки малюють двоє: блок шаблону (`ShopGridBlock` — те, що бачить продавець у
 * редакторі й у перегляді) і сама вітрина (`ShopStore` — те, що бачить покупець).
 * Два місця з однаковою розміткою розійшлися б тихо: полиця вітрини почала б
 * виглядати інакше за полицю редактора, і «як воно буде насправді» перестало б
 * мати відповідь (`AGENTS.md` §7). Тому розмітка тут, а різниця між двома
 * місцями — рівно в **дії** (`actionLabel`, `onOpen`) і заголовку секції.
 *
 * **Фото, якого немає, лишає по собі місце** (`.shop-card-img--empty`): рядок
 * товарів не мусить стрибати від того, чи завантажили знімок.
 *
 * @module packages/ui/src/blocks/ShopCardTile
 */

import { Icon } from "@wwwuabot/shared";
import type { ShopCard } from "@wwwuabot/shared/shop";

export interface ShopCardTileProps {
  card: ShopCard;
  /**
   * Дія картки; без неї картка не натискається.
   *
   * Це не дрібниця: у перегляді шаблону товарів **немає** — там приклад, і
   * кнопка на ньому обіцяла б покупцеві те, чого не існує.
   */
  onOpen?: (id: number) => void;
  /** Напис на кнопці — те, що станеться після дотику. */
  actionLabel?: string;
}

export function ShopCardTile({ card, onOpen, actionLabel = "Детальніше" }: ShopCardTileProps) {
  return (
    <article className="shop-card">
      {card.photoUrl ? (
        <img className="shop-card-img" src={card.photoUrl} alt="" loading="lazy" />
      ) : (
        <div className="shop-card-img shop-card-img--empty" aria-hidden="true">
          <Icon name="image" size={22} />
        </div>
      )}
      <h3 className="shop-card-title">{card.title}</h3>
      <p className="shop-card-price">{card.price}</p>
      <p className="shop-card-summary">{card.summary || card.kindLabel}</p>
      {onOpen && (
        <button type="button" className="shop-card-order" onClick={() => onOpen(card.id)}>
          {actionLabel}
        </button>
      )}
    </article>
  );
}
