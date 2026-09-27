/**
 * Плитка товару — **один вигляд картки** для вітрини й сітки сторінки.
 *
 * Картки малюють двоє: блок шаблону (`ShopGridBlock` — те, що бачить продавець у
 * редакторі й у перегляді) і сама вітрина (`ShopStore` — те, що бачить покупець).
 * Два місця з однаковою розміткою розійшлися б тихо: полиця вітрини почала б
 * виглядати інакше за полицю редактора, і «як воно буде насправді» перестало б
 * мати відповідь (`AGENTS.md` §7). Тому розмітка тут, а різниця між двома
 * місцями — рівно в **діях** (`onAdd`, `onSetQty`, `onOpen`).
 *
 * **Кількість міняють у плитці.** Покупець, який бере те саме вдруге, уже знає
 * товар; відкривати заради цього картку з фото, описом і характеристиками —
 * це платити за нього екраном. Тому в плитці стоїть крок `− N шт +`, і той
 * самий рядок місця займає кнопка «В кошик» до першої покупки: висота плитки
 * не стрибає від того, чи товар уже в кошику.
 *
 * **Дій немає — плитки немає дій.** У перегляді шаблону товарів не існує
 * (`ShopGridBlock`), і кнопка на прикладі обіцяла б покупцеві те, чого немає.
 * Гейт на дію — сам обробник, а не окремий прапорець: передали `onAdd` — є кнопка.
 *
 * **Фото — такий самий вхід у товар, як «Детальніше».** У каталозі натискають
 * на зображення: воно найбільше, і палець іде в нього першим. Тому в плитці
 * вітрини фото стає кнопкою й відкриває ту саму поверхню товару, а підпис
 * «Детальніше» лишається під ним — палець шукає фото, око шукає слово, і
 * прибрати підпис означало б лишити вхід без назви. Гейт той самий, що в
 * решти дій: є `onOpen` — фото натискається, немає (`ShopGridBlock`) — фото
 * лишається полотном.
 *
 * **Фото, якого немає, лишає по собі місце** (`.shop-card-img--empty`): рядок
 * товарів не мусить стрибати від того, чи завантажили знімок.
 *
 * @module packages/ui/src/blocks/ShopCardTile
 */

import { Icon } from "@wwwuabot/shared";
import { cartLineLabel, type ShopCard } from "@wwwuabot/shared/shop";

/** Напис кнопки першої покупки: не «Детальніше» — дотик кладе товар у кошик. */
const ADD_LABEL = "В кошик";

export interface ShopCardTileProps {
  card: ShopCard;
  /** Скільки одиниць товару вже в кошику; `0` — товару в кошику немає. */
  qty?: number;
  /** Покласти одну одиницю в кошик, **не відкриваючи** товар. */
  onAdd?: (id: number) => void;
  /** Поставити кількість; `0` прибирає позицію (мінус на одиниці). */
  onSetQty?: (id: number, qty: number) => void;
  /** Відкрити товар: галерея, опис, характеристики. **Ним же натискається фото.** */
  onOpen?: (id: number) => void;
  /**
   * Відкрити товар **на правку** — дія продавця, а не покупця.
   *
   * Окремо від `onOpen` навмисно: покупцеві ця дія показує товар, продавцю —
   * форму товару, і злити їх в одну означало б назвати обидві «Детальніше».
   */
  onEdit?: (id: number) => void;
}

export function ShopCardTile({
  card,
  qty = 0,
  onAdd,
  onSetQty,
  onOpen,
  onEdit,
}: ShopCardTileProps) {
  // Товар у кошику показують кроком лише тоді, коли його справді є чим міняти:
  // кількість без `onSetQty` — це плитка, яка обіцяє дію й не робить нічого.
  const stepper = qty > 0 && onSetQty ? onSetQty : null;
  // Сума позиції — **спільним підписом** із карткою товару (`cartLineLabel`):
  // копійки в ціні («USD 4.80») мусять бути видні в обох місцях однаково.
  const line = stepper ? cartLineLabel(card.price, qty) : null;
  const hasActions = Boolean(stepper ?? onAdd ?? onOpen ?? onEdit);

  // Фото й мітка — **один вміст для двох випадків**: у вітрині цей прямокутник
  // стає кнопкою, у перегляді шаблону лишається полотном. Розмітка вмісту від
  // того, хто його тримає, не залежить — другого фото в проєкті немає.
  const media = (
    <>
      {card.photoUrl ? (
        <img className="shop-card-img" src={card.photoUrl} alt={card.title} loading="lazy" />
      ) : (
        // `span`, а не `div`: цей вміст стоїть і всередині кнопки, а блоковий
        // елемент у ній — уже не розмітка, а те, що браузер мусить пробачити.
        <span className="shop-card-img shop-card-img--empty" aria-hidden="true">
          <Icon name="image" size={24} />
        </span>
      )}
      <span className="shop-card-badge">{card.category}</span>
    </>
  );

  return (
    <article className="shop-card">
      {onOpen ? (
        <button
          type="button"
          className="shop-card-media shop-card-media--open"
          onClick={() => onOpen(card.id)}
          aria-label={`Детальніше: ${card.title}`}
        >
          {media}
        </button>
      ) : (
        <div className="shop-card-media">{media}</div>
      )}

      <div className="shop-card-content">
        <h3 className="shop-card-title">{card.title}</h3>
        <p className="shop-card-price">{card.price}</p>
        <p className="shop-card-summary">{card.summary || card.kindLabel}</p>
      </div>

      {hasActions && (
        <div className="shop-card-actions">
          {stepper ? (
            <>
              <div className="shop-card-qty">
                <button
                  type="button"
                  className="shop-card-qty-btn"
                  onClick={() => stepper(card.id, qty - 1)}
                  aria-label={`Прибрати одну одиницю: ${card.title}`}
                >
                  <Icon name="minus" size={16} />
                </button>
                <span className="shop-card-qty-value">{qty} шт</span>
                <button
                  type="button"
                  className="shop-card-qty-btn"
                  onClick={() => stepper(card.id, qty + 1)}
                  aria-label={`Додати одну одиницю: ${card.title}`}
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>

              {/* Рядок кошика — **сума, а не ще одна ціна**: покупець бачить,
                  що саме він набрав, не відкриваючи кошик. Ціни без числа
                  («договірна») рядка не отримують — показати на їхньому місці
                  «0 ₴» означало б запропонувати безкоштовне замовлення. */}
              {line !== null && (
                <p className="shop-card-incart">
                  <Icon name="check" size={13} />У кошику · {line}
                </p>
              )}
            </>
          ) : (
            onAdd && (
              <button
                type="button"
                className="shop-card-order"
                onClick={() => onAdd(card.id)}
                aria-label={`${ADD_LABEL}: ${card.title}`}
              >
                <Icon name="plus" size={16} />
                {ADD_LABEL}
              </button>
            )
          )}

          {onOpen && (
            <button
              type="button"
              className="shop-card-details"
              onClick={() => onOpen(card.id)}
              aria-label={`Детальніше: ${card.title}`}
            >
              Детальніше
              <Icon name="arrow-right" size={14} />
            </button>
          )}

          {/* Правка — те саме місце, інша дія й інший, хто її бачить. Клас
              узятий той самий: це та сама кнопка за роллю, і друга назва
              правила в CSS означала б друге правило для тієї ж кнопки. */}
          {onEdit && (
            <button
              type="button"
              className="shop-card-details"
              onClick={() => onEdit(card.id)}
              aria-label={`Редагувати: ${card.title}`}
            >
              <Icon name="edit" size={14} />
              Редагувати
            </button>
          )}
        </div>
      )}
    </article>
  );
}
