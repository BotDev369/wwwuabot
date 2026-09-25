/**
 * «Товари» — список того, що продає цей магазин.
 *
 * **Екран, а не поверхня, і це той самий вибір, що в сторінках.** Товарів у
 * магазині багато, у кожного своя адреса, і повернутись до списку треба
 * посиланням; у модалки немає ні історії, ні «назад» (`AGENTS.md` §7).
 *
 * **Чернетку видно тут і тільки тут.** Публічний каталог відбирає
 * `is_active = 1` у запиті до бази, тож непоказане лишається справою продавця —
 * а список мусить казати, який товар уже в каталозі, а який ще ні
 * (`docs/SHOPS.md` §3).
 *
 * **Товари бувають лише в магазину.** Сторінка з іншим шаблоном цей екран
 * відкрити не може, але адресу можна написати руками — тоді чесніше сказати
 * «це не магазин», ніж показати порожній список, який виглядає як «нічого не
 * додано».
 *
 * @module web-platform-dev/src/pages/shop
 */

import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { mediaUrl, type ShopMedia, type ShopProduct } from "@wwwuabot/shared/shop";
import { useDialog } from "@wwwuabot/ui/dialog";
import { shopProductEditPath, shopProductNewPath, userPagePath } from "@/app/routes";
import { PageState } from "@/pages/user-pages/PageState";
import { useUserPage } from "@/pages/user-pages/useUserPage";
import { shopApi } from "@/shared/api/shop.api";
import { productCover, productHint, productStateLabel } from "./shop-view";
import { useShopProducts } from "./useShopProducts";

export function ShopProductsPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dialog = useDialog();
  const { page, loading, error } = useUserPage(id);
  const shop = useShopProducts(page?.id ?? null);

  const isShop = page?.template === "shop";

  async function removeProduct(target: ShopProduct): Promise<void> {
    if (!page) return;
    const confirmed = await dialog.confirm(`Прибрати товар «${target.title}»?`, {
      title: "Видалення",
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (!confirmed) return;

    try {
      await shopApi.removeProduct(page.id, target.id);
      shop.remove(target.id);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося прибрати товар", {
        title: "Помилка",
      });
    }
  }

  if (!page) {
    return (
      <div className="wb-page">
        <PageState loading={loading} message={error ?? "Такої сторінки немає."} />
      </div>
    );
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          <button
            type="button"
            className="wb-close-btn"
            onClick={() => void navigate(userPagePath(page.id))}
            aria-label="Назад"
          >
            <Icon name="arrow-left" size={18} />
          </button>
          Товари
        </h1>
        {isShop && (
          <div className="wb-page-actions">
            <button
              type="button"
              className="wb-btn wb-btn-primary wb-page-add"
              onClick={() => void navigate(shopProductNewPath(page.id))}
              aria-label="Додати товар"
            >
              <Icon name="plus" size={20} />
            </button>
          </div>
        )}
      </div>

      {!isShop ? (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-empty-text">Товари бувають лише в магазину.</p>
          <p className="wb-empty-text">
            Ця сторінка зібрана з іншого шаблону. Щоб продавати, створіть сторінку з шаблону
            «Магазин».
          </p>
        </div>
      ) : (
        <>
          {shop.loading && (
            <div className="wb-empty">
              <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
              <p className="wb-text-muted">Завантаження товарів…</p>
            </div>
          )}

          {!shop.loading && shop.error && (
            <div className="wb-empty">
              <span className="wb-empty-icon">
                <Icon name="warning" size={32} />
              </span>
              <p className="wb-text-red">{shop.error}</p>
            </div>
          )}

          {!shop.loading && !shop.error && shop.products.length === 0 && (
            <div className="wb-empty">
              <span className="wb-empty-icon">
                <Icon name="shop" size={32} />
              </span>
              <p className="wb-empty-text">У магазині ще немає товарів.</p>
              <p className="wb-empty-text">
                Натисніть «+» угорі, додайте перший товар із фото — і він зʼявиться під вітриною.
              </p>
            </div>
          )}

          {!shop.loading && !shop.error && shop.products.length > 0 && (
            <div className="shop-products">
              {shop.products.map((product) => (
                <div key={product.id} className="shop-product-row">
                  <button
                    type="button"
                    className="shop-product-main"
                    onClick={() => void navigate(shopProductEditPath(page.id, product.id))}
                  >
                    <ShopThumb product={product} media={shop.media} />
                    <span className="wb-menu-item-text">
                      <span className="wb-menu-item-label">{product.title}</span>
                      <span className="wb-menu-item-hint">
                        {productHint(product)} · {productStateLabel(product)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="wb-btn wb-btn-ghost site-editor-icon-btn"
                    onClick={() => void removeProduct(product)}
                    aria-label={`Прибрати ${product.title}`}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ))}

              {/* Кажемо, як додати фото: без нього товар у каталозі — сам текст,
                  і саме тому це перше, що варто знати продавцю. */}
              <p className="wb-text-muted shop-note">
                Фото додають у самому товарі. Перше з них — головне: саме його видно в каталозі.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Обкладинка товару: перше фото або порожнє місце під нього. */
function ShopThumb({ product, media }: { product: ShopProduct; media: ShopMedia[] }): ReactElement {
  const cover = productCover(product, media);

  return (
    <span className="shop-thumb">
      {cover ? (
        <img className="shop-thumb-img" src={mediaUrl(cover.key)} alt="" loading="lazy" />
      ) : (
        <Icon name="image" size={18} />
      )}
    </span>
  );
}
