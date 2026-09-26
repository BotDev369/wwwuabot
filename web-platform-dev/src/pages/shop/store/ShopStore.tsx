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

import { useMemo, useRef, useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  cartTotal,
  productCards,
  shopCatalogs,
  type ShopMedia,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { ShopCardTile } from "@wwwuabot/ui/blocks/ShopCardTile";
import { ZoneRenderer } from "@wwwuabot/ui/ZoneRenderer";
import type { BlockContext, PageConfig } from "@wwwuabot/shared/types/page-config";
import {
  cartCountLabel,
  cartTotalLabel,
  filterCards,
  goodsLabel,
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
  const [query, setQuery] = useState("");
  const [openedProduct, setOpenedProduct] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const catalogRef = useRef<HTMLElement | null>(null);

  const shown = useMemo(() => filterCards(cards, catalog, query), [cards, catalog, query]);

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
  const product = products.find((item) => item.id === openedProduct) ?? null;
  const total = cartTotal(cart.lines, products);

  function addToCart(qty: number): void {
    if (openedProduct === null) return;
    cart.add(openedProduct, qty);
    setOpenedProduct(null);
    setCartOpen(true);
  }

  function scrollTo(target: HTMLElement | null): void {
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={`shop-store${cart.count > 0 ? " shop-store--cart-open" : ""}`}>
      <header className="shop-store-hero">
        {/* Обкладинка — **тло шапки**, а не картинка в ній: із назвою поверх
            банера шапка читається як сайт магазину, а не як плейсхолдер. */}
        {photoUrl && <img className="shop-store-cover" src={photoUrl} alt="" />}

        <div className="shop-store-hero-body">
          <p className="shop-store-kicker">{storeStatsLabel(cards.length, catalogs.length)}</p>
          <h1 className="shop-store-title">{title?.trim() || "Магазин"}</h1>
          {tagline && <p className="shop-store-tagline">{tagline}</p>}
        </div>
      </header>

      {/* Пошук стоїть **на межі обкладинки**: покупець бачить поле магазину, а
          не ще один рядок у шапці, і каталог від цього не з'їжджає вниз. */}
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

      <div className="shop-store-actions">
        <button
          type="button"
          className="wb-btn wb-btn-primary"
          onClick={() => scrollTo(catalogRef.current)}
        >
          <Icon name="grid" size={16} />
          Каталог
        </button>
        <button type="button" className="wb-btn wb-btn-secondary" onClick={() => setCartOpen(true)}>
          <Icon name="list" size={16} />
          {cartCountLabel(cart.count)}
        </button>
      </div>

      <section className="shop-store-catalog" ref={catalogRef}>
        {/* Заголовок полиці: покупець має бачити, що це каталог, і скільки в
            ньому є, — без цього сітка читалась як «десь усе підряд». */}
        <div className="shop-store-catalog-head">
          <h2 className="shop-store-catalog-title">Каталог</h2>
          <span className="shop-store-catalog-count">{goodsLabel(cards.length)}</span>
        </div>

        {catalogs.length > 1 && (
          <div className="shop-store-chips">
            <button
              type="button"
              className={`shop-chip${catalog === null ? " shop-chip--active" : ""}`}
              onClick={() => setCatalog(null)}
            >
              Усі товари
            </button>
            {catalogs.map((group) => (
              <button
                type="button"
                key={group.title}
                className={`shop-chip${catalog === group.title ? " shop-chip--active" : ""}`}
                onClick={() => setCatalog(group.title)}
              >
                {group.title} · {group.count}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="wb-text-muted shop-note">Завантажуємо каталог…</p>
        ) : shown.length > 0 ? (
          <div className="shop-catalog-grid">
            {shown.map((card) => (
              <ShopCardTile key={card.id} card={card} onOpen={setOpenedProduct} />
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

      {info.length > 0 && (
        <section className="shop-store-info" id="shop-store-about">
          <ZoneRenderer
            blocks={info}
            zone="main"
            context={context}
            className="shop-store-sections"
          />
        </section>
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
