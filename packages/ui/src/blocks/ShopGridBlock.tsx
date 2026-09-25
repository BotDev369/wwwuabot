/**
 * Page Builder — `shop-grid`: сітка товарів магазину.
 *
 * **Товарів у `page_data` немає, і це головне про цей блок.** Вітрина — рядок
 * `scenarios` із `page_data`, а товар — рядок `shop_products`
 * (`docs/SHOPS.md` §3), тож блок не читає їх ані з props, ані з полів: він бере
 * готові картки з контексту (`context.shopCards`), який кладе той, хто знає
 * адресу магазину. Тому блок не має жодного запиту — і саме тому працює і в
 * `web-platform-dev`, і в адмінці.
 *
 * **Немає даних — немає сітки, і це різні випадки.**
 *
 * - картки прийшли й вони є — сітка з товарів;
 * - картки прийшли порожніми — сітки немає: у магазину ще нічого не продають, і
 *   «Товари» з порожнім місцем обіцяло б покупцеві те, чого немає;
 * - карток не прийшло зовсім, а сторінку показують як **перегляд шаблону**
 *   (`context.preview`) — малюється приклад: інакше шаблон магазину виглядав би
 *   кількома текстовими картками, тобто рівно тим, чим він не є.
 *
 * **Приклад — це не товари.** Він стоїть окремим списком у коді
 * (`EXAMPLE_CARDS`), підписаний («приклад») і не може потрапити в жоден
 * справжній магазин: живі картки приходять тільки з контексту, а перегляд
 * шаблону нічого не продає.
 *
 * @module packages/ui/src/blocks/ShopGridBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import type { ShopCard } from "@wwwuabot/shared/shop";
import { ShopCardTile } from "./ShopCardTile";

/**
 * Приклад товарів для перегляду шаблону.
 *
 * Номери від'ємні навмисно: у справжнього товару `id` більший за нуль
 * (`shop_products.id`), тож приклад не зійдеться з жодним рядком навіть
 * випадково. Розділи в прикладі різні — щоб було видно, що каталогів у
 * магазині буває кілька.
 */
const EXAMPLE_CARDS: readonly ShopCard[] = [
  {
    id: -1,
    title: "Еспресо-суміш, 250 г",
    price: "320 ₴",
    photoUrl: null,
    kindLabel: "Фізичний товар",
    summary: "Темне обсмаження — горіх і шоколад",
    category: "Кава",
  },
  {
    id: -2,
    title: "Керамічна чашка 200 мл",
    price: "480 ₴",
    photoUrl: null,
    kindLabel: "Фізичний товар",
    summary: "Ручна робота, три кольори",
    category: "Посуд",
  },
  {
    id: -3,
    title: "Рецепти холодної кави",
    price: "150 ₴",
    photoUrl: null,
    kindLabel: "Цифровий товар",
    summary: "PDF, надсилаємо в чат після оплати",
    category: "Кава",
  },
];

export function ShopGridBlock({ block, context }: BlockComponentProps) {
  const { title = "Товари" } = block.props as { title?: string };

  const cards = context.shopCards;
  const isPreview = !cards && Boolean(context.preview);
  const shown = cards && cards.length > 0 ? cards : isPreview ? EXAMPLE_CARDS : [];

  // Дії тут немає й не мусить бути: сторінку магазину відкриває **вітрина**
  // (`pages/shop/store/ShopStore`), а цей блок лишається тим, що бачить
  // продавець у редакторі й у перегляді шаблону. Кнопка в перегляді обіцяла б
  // покупцеві товар із прикладу.
  if (shown.length === 0) return null;

  return (
    <section className="shop-catalog">
      <h2 className="shop-catalog-title">{title}</h2>

      <div className="shop-catalog-grid">
        {shown.map((card) => (
          <ShopCardTile key={card.id} card={card} />
        ))}
      </div>

      {isPreview && (
        <p className="wb-text-muted shop-note">
          Це приклад. Свої товари додасте після збереження сторінки — вони й стануть на це місце.
        </p>
      )}
    </section>
  );
}
