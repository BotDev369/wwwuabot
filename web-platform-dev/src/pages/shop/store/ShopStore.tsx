/**
 * Вітрина магазину — **один екран, на якому є все**.
 *
 * Доти ця сторінка рендерилась як звичайна сторінка контенту: блоки з
 * `page_data` плюс сітка товарів. Магазин від цього не ставав магазином — у
 * нього не було ні каталогів, ні кошика, ні замовлення, і покупець міг рівно
 * одне: подивитись картинки. Тепер шапка, каталог і інформація про магазин
 * зібрані в одному місці, а дії (товар, кошик, оформлення) приходять
 * поверхнями — покупець не виходить із вітрини й не губить те, що вже набрав.
 *
 * **Сторінку не викинуто, а вбудовано.** Текст про магазин, умови доставки й
 * контакти пише продавець у **редакторі сторінки** (це його `page_data`), і
 * вітрина показує ці самі блоки — усі, крім сітки товарів: сітку малює
 * каталог, який читає товари з їхньої таблиці. Друге джерело «про магазин»
 * зробило б із вітрини другу правду про нього (`AGENTS.md` §7).
 *
 * **Каталогів і товарів тут не обмежує ніщо, крім магазину.** Розділи
 * складаються з товарів (`shopCatalogs`), тож новий розділ заводиться просто
 * назвою в товарі, а не заявкою на нього; каталог приходить тим самим
 * запитом, що й список продавця.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import { useMemo, useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  cartTotal,
  productCards,
  shopCatalogs,
  type ShopMedia,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { ShopCardTile } from "@wwwuabot/ui/blocks/ShopCardTile";
import { MenuModal, type MenuItem } from "@wwwuabot/ui/menu";
import { ZoneRenderer } from "@wwwuabot/ui/ZoneRenderer";
import type { BlockContext, PageConfig } from "@wwwuabot/shared/types/page-config";
import {
  ALL_CATALOG_LABEL,
  catalogCaption,
  catalogCount,
  cartCountLabel,
  cartTotalLabel,
  filterCards,
  storeSections,
  storeStatsLabel,
  storeTagline,
} from "./store-view";
import { useShopCart } from "./useShopCart";
import { ShopProductModal } from "./ShopProductModal";
import { ShopCartModal } from "./ShopCartModal";
import { ShopCheckoutModal } from "./ShopCheckoutModal";

/** Тип блока, який малює каталог: решта блоків — текст про магазин. */
const GRID_BLOCK = "shop-grid";

export interface ShopStoreProps {
  /** Адреса магазину — нею ж замовляють (`placeOrder`). */
  slug: string;
  title: string | null;
  photoUrl: string | null;
  config: PageConfig;
  context: BlockContext;
  products: ShopProduct[];
  media: ShopMedia[];
  loading: boolean;
}

export function ShopStore({
  slug,
  title,
  photoUrl,
  config,
  context,
  products,
  media,
  loading,
}: ShopStoreProps): ReactElement {
  const cards = useMemo(() => productCards(products, media), [products, media]);
  const catalogs = useMemo(() => shopCatalogs(products), [products]);
  const tagline = useMemo(() => storeTagline(config), [config]);

  const cart = useShopCart(slug);
  const [catalog, setCatalog] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openedProduct, setOpenedProduct] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const shown = useMemo(() => filterCards(cards, catalog, query), [cards, catalog, query]);

  // Кількість по товару — з кошика, і **одним переглядом**: крок стоїть у
  // кожній плитці, а `find` на кожен товар зробив би з сітки квадратичний
  // прохід на кожен дотик до кнопки.
  const inCart = useMemo(
    () => new Map(cart.lines.map((line) => [line.productId, line.qty])),
    [cart.lines],
  );

  // Текст про магазин — усе, що продавець написав на сторінці **крім** сітки
  // та блоку заголовка магазину (id: "head" чи "-head"):
  // назва та опис уже в шапці вітрини, а каталог читає живі товари.
  const info = useMemo(
    () =>
      (config.zones?.main ?? []).filter((block) => {
        if (block.type === GRID_BLOCK) return false;
        if (block.id === "head" || block.id?.endsWith("-head")) return false;
        return true;
      }),
    [config],
  );
  // Кожен текст продавця — **окремий розділ зі своєю шапкою**: три абзаци в
  // спільній панелі читались як один текст без меж, і покупець не бачив, де
  // кінчається «Про магазин» і починається «Доставка».
  const sections = useMemo(() => storeSections(info), [info]);

  const product = products.find((item) => item.id === openedProduct) ?? null;
  const total = cartTotal(cart.lines, products);

  // Вибране на кнопці — **назва словом і обсяг числом**, і то окремо: число
  // стоїть плашкою (`.shop-store-catalog-count`), а не в тексті назви. Розділ,
  // якого в товарах уже немає, назву не губить — число тоді нуль.
  const pickLabel = catalog ?? ALL_CATALOG_LABEL;
  const pickCount = catalogCount(catalog, catalogs, cards.length);

  // Пункти вибору розділу — **ті самі числа, що в сітці**: розділ без товарів
  // у списку не з'явиться взагалі, бо його не існує (`shopCatalogs`).
  // «Усі товари» стоїть першим: це стан вітрини за замовчуванням, а не ще один
  // розділ серед інших.
  const catalogItems: MenuItem[] = [
    {
      key: ALL_CATALOG_LABEL,
      label: catalogCaption(null, catalogs, cards.length),
      selected: catalog === null,
      onSelect: () => {
        setCatalog(null);
        setCatalogOpen(false);
      },
    },
    ...catalogs.map((group) => ({
      key: group.title,
      label: catalogCaption(group.title, catalogs, cards.length),
      selected: catalog === group.title,
      onSelect: () => {
        setCatalog(group.title);
        setCatalogOpen(false);
      },
    })),
  ];

  function addToCart(qty: number): void {
    if (openedProduct === null) return;
    cart.add(openedProduct, qty);
    setOpenedProduct(null);
    setCartOpen(true);
  }

  return (
    <div className={`shop-store${cart.count > 0 ? " shop-store--cart-open" : ""}`}>
      <header className="shop-store-hero">
        {/* Обкладинка — **тло шапки**, а не картинка в ній: із назвою поверх
            банера шапка читається як сайт магазину, а не як плейсхолдер. */}
        {photoUrl && <img className="shop-store-cover" src={photoUrl} alt="" />}

        <div className="shop-store-hero-body">
          <h1 className="shop-store-title">{title?.trim() || "Магазин"}</h1>
          {tagline && <p className="shop-store-tagline">{tagline}</p>}
        </div>
      </header>

      {/* Полиця — **разом із керуванням**: назва, пошук, кошик і вибір розділу
          стоять однією смугою, і вона їде за прокруткою сама. Другої такої
          смуги немає (`AGENTS.md` §7) — тому в банері лишаються тільки назва
          магазину й короткий опис. */}
      <section className="shop-store-catalog" aria-label="Каталог">
        {/* Смуга полиці **закріплюється** вгорі й несе **все, чим полицю
            керують**: пошук, кошик і вибір розділу. Доти пошук стояв на межі
            обкладинки, а кошик — на самій обкладинці: покупець, який прокрутив
            сітку на екран униз, втрачав обидва, і щоб щось знайти або побачити
            набране, мусив вертатись на початок сторінки.

            Другої копії цих керувань немає ні в банері, ні деінде
            (`AGENTS.md` §7): пошук і кошик на обкладинці лишались би тими
            самими двома керуваннями, які зникають з екрана. */}
        <div className="shop-store-bar">
          {/* Шапка смуги — **назва, пошук і кошик в один ряд**: назва каже, що
              це за полиця, пошук шукає по ній, кошик показує набране. */}
          <div className="shop-store-catalog-head">
            <h2 className="shop-store-catalog-title">Каталог</h2>

            <div className="shop-search">
              <Icon name="search" size={18} />
              <input
                className="shop-search-input"
                type="search"
                value={query}
                placeholder="Пошук товару"
                aria-label="Пошук товару"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <button
              type="button"
              className="shop-store-cart"
              onClick={() => setCartOpen(true)}
              aria-label={cartCountLabel(cart.count)}
            >
              <Icon name="cart" size={18} />
              {cart.count > 0 && <span className="shop-store-cart-count">{cart.count}</span>}
            </button>
          </div>

          {/* Вибір розділу — **одна кнопка зі списком**, а не ряд чипів: чипи
              займали цілу смугу, вміщали два з половиною розділи, і третій
              рвався на півслові («Імуніт…»). Кнопка називає вибране словом,
              а список відкривається **поверхнею** — тією самою, що вибір
              вигляду в колекціях (правило 4 дизайн-системи: вибір не випадає
              списком, а займає окреме вікно). */}
          {catalogs.length > 1 && (
            <button
              type="button"
              className="shop-pick"
              aria-haspopup="dialog"
              aria-label={`Розділ каталогу: ${pickLabel}`}
              onClick={() => setCatalogOpen(true)}
            >
              <span className="shop-pick-label">{pickLabel}</span>
              <span className="shop-store-catalog-count">{pickCount}</span>
              <Icon name="chevron-down" size={16} className="shop-pick-icon" />
            </button>
          )}
        </div>

        {loading ? (
          <p className="wb-text-muted shop-note">Завантажуємо каталог…</p>
        ) : shown.length > 0 ? (
          <div className="shop-catalog-grid">
            {shown.map((card) => (
              <ShopCardTile
                key={card.id}
                card={card}
                qty={inCart.get(card.id) ?? 0}
                onAdd={cart.add}
                onSetQty={cart.setQty}
                onOpen={setOpenedProduct}
              />
            ))}
          </div>
        ) : (
          <p className="wb-text-muted shop-note">
            {cards.length === 0
              ? "У магазині ще немає товарів — зазирніть пізніше."
              : "За такою умовою нічого не знайшлось. Спробуйте інший розділ."}
          </p>
        )}
      </section>

      {/* Переваги магазину — **чипси одним рядком**: три колонки з описами
          займали півекрана, а переваги читають один раз. */}
      <section className="shop-store-trust" aria-label="Переваги покупки">
        <p className="shop-trust-item">
          <span className="shop-trust-icon" aria-hidden="true">
            <Icon name="check" size={14} />
          </span>
          Без посередників
        </p>
        <p className="shop-trust-item">
          <span className="shop-trust-icon" aria-hidden="true">
            <Icon name="sparkles" size={14} />
          </span>
          Перевірена якість
        </p>
        <p className="shop-trust-item">
          <span className="shop-trust-icon" aria-hidden="true">
            <Icon name="message-square" size={14} />
          </span>
          Зв’язок у Telegram
        </p>
      </section>

      {sections.length > 0 && (
        <section className="shop-store-info" id="shop-store-about">
          {sections.map((item) => (
            <article className="shop-section" key={item.id}>
              {item.title && (
                <header className="shop-section-head">
                  {/* Знак у шапці — не прикраса: це єдине, чим розділ
                      відрізняється від сусіднього, ще до читання назви. */}
                  <span className="shop-section-icon" aria-hidden="true">
                    <Icon name={item.icon} size={16} />
                  </span>
                  <h3 className="shop-section-title">{item.title}</h3>
                </header>
              )}
              {item.blocks.length > 0 && (
                <ZoneRenderer
                  blocks={item.blocks}
                  zone="main"
                  context={context}
                  className="shop-section-body"
                />
              )}
            </article>
          ))}
        </section>
      )}

      {/* Вибір розділу — та сама поверхня, що й решта виборів у продукті:
          повноекранний список із галочкою на вибраному (правило 4). Довідка
          про обсяг магазину переїхала сюди — її читають саме тоді, коли
          вибирають розділ, а в закріпленій смузі вона займала місце, потрібне
          назвам розділів. */}
      {catalogOpen && (
        <MenuModal
          title="Розділ каталогу"
          header={<p className="wb-menu-hint">{storeStatsLabel(cards.length, catalogs.length)}</p>}
          items={catalogItems}
          onClose={() => setCatalogOpen(false)}
        />
      )}

      {product && (
        <ShopProductModal
          product={product}
          media={media}
          onClose={() => setOpenedProduct(null)}
          onAdd={addToCart}
        />
      )}

      {cartOpen && !checkingOut && (
        <ShopCartModal
          lines={cart.lines}
          products={products}
          media={media}
          onClose={() => setCartOpen(false)}
          onSetQty={cart.setQty}
          onRemove={cart.remove}
          onCheckout={() => setCheckingOut(true)}
        />
      )}

      {checkingOut && (
        <ShopCheckoutModal
          shopSlug={slug}
          lines={cart.lines}
          products={products}
          onClose={() => setCheckingOut(false)}
          onPlaced={() => {
            cart.clear();
            setCheckingOut(false);
            setCartOpen(false);
          }}
        />
      )}

      {/* Оплата — поза платформою, тож про неї каже сама вітрина, а не форма:
          покупець мусить знати це **до** того, як натисне «оформити» (§9). А
          сума тут — **довідка**, а не ціна замовлення: її називає продавець,
          і саме тому вона підписана `cartTotalLabel`. */}
      <p className="shop-store-note">
        {/* Іконка потрібна не для прикраси: це єдине місце на екрані, де йде
            мова про **гроші**, і без неї абзац зливався з розділами вище. */}
        <Icon name="info" size={16} className="shop-store-note-icon" />
        <span>
          Оплата — домовленість із продавцем: платформа замовлення зберігає, а гроші не бере.
          {cart.count > 0 && ` У кошику: ${cartTotalLabel(total)}.`}
        </span>
      </p>

      {/* Плаваючий закріплений бар кошика (Sticky Cart Bar), коли в кошику є товари */}
      {cart.count > 0 && (
        <aside className="shop-sticky-cart" aria-label="Швидкий доступ до кошика">
          <div className="shop-sticky-cart-info">
            <span className="shop-sticky-cart-count">{cartCountLabel(cart.count)}</span>
            <span className="shop-sticky-cart-total">{cartTotalLabel(total)}</span>
          </div>
          <button type="button" className="shop-sticky-cart-btn" onClick={() => setCartOpen(true)}>
            <Icon name="list" size={18} />
            Переглянути
          </button>
        </aside>
      )}
    </div>
  );
}
