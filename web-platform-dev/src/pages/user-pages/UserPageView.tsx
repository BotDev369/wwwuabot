/**
 * Сторінка — **лише перегляд**.
 *
 * Сторінку збирає й публікує розробник (код і міграції). На екрані немає ні
 * перемикача видимості, ні складу адмінів, ні видалення, ні правки тексту: це
 * рішення платформи, а не дія людини. Лишається те, заради чого сюди прийшли —
 * побачити сторінку такою, якою її побачать інші, і (в магазині) зайти в товари
 * й замовлення: вони належать магазину, а не сторінці.
 *
 * **Сторінка тут — та сама, що назовні.** Малює її спільне `PageCanvas` — той
 * самий `PageRenderer`, що й на `/slug`, тож приватна й публічна відрізняються
 * прапорцем у даних, а не поданням.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import { type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { Icon } from "@wwwuabot/shared";
import { buildPageConfig, pageTemplate } from "@wwwuabot/shared/pages";
import { PageCanvas } from "@wwwuabot/ui";
import { registerAllBlocks } from "@wwwuabot/ui/blocks";
import { productCards } from "@wwwuabot/shared/shop";
import { PAGES_PATH, shopProductEditPath } from "@/app/routes";
import { ShopPanel } from "@/pages/shop/ShopPanel";
import { useShopProducts } from "@/pages/shop/useShopProducts";
import { PageState } from "./PageState";
import { useUserPage } from "./useUserPage";

registerAllBlocks();

export function UserPageView(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { page, loading, error } = useUserPage(id);

  useScreenChrome({
    title: page?.title ?? null,
    share: null,
    favorite: page ? { kind: "page", targetId: page.id } : null,
  });

  // Товари належать магазину (`shop_id` — номер цієї ж сторінки), а живуть вони
  // в окремій таблиці, тож сторінка питає їх окремо (docs/SHOPS.md §1). Питають
  // **лише** в магазину: решті шаблонів `useShopProducts(null)` не робить
  // жодного запиту.
  const shopId = page && page.template === "shop" ? page.id : null;
  const shop = useShopProducts(shopId);

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          <button
            type="button"
            className="wb-close-btn"
            onClick={() => void navigate(PAGES_PATH)}
            aria-label="Назад"
          >
            <Icon name="arrow-left" size={18} />
          </button>
          {page?.title ?? "Сторінка"}
        </h1>
      </div>

      {!page ? (
        <PageState loading={loading} message={error ?? "Такої сторінки немає."} />
      ) : (
        <>
          {/* Картка магазину стоїть **перед** сторінкою: у магазині головне —
              товари, і без неї власник бачив би рівно текст вітрини, ніби
              товарів і не існує (`pages/shop/ShopPanel`). */}
          {shopId !== null && (
            <ShopPanel
              pageId={page.id}
              loading={shop.loading}
              count={shop.products.length}
              error={shop.error}
            />
          )}

          <PageCanvas
            config={buildPageConfig(pageTemplate(page.template), page.values)}
            context={{
              slug: page.slug,
              title: page.title,
              photoUrl: null,
              // Сітка вітрини бере товари звідси: у `page_data` їх немає.
              shopCards: shopId === null ? undefined : productCards(shop.products, shop.media),
              // Плитка товару веде в правку **товару**, а не сторінки.
              shopEditProduct:
                shopId === null
                  ? undefined
                  : (productId: number) => void navigate(shopProductEditPath(page.id, productId)),
            }}
          />
        </>
      )}
    </div>
  );
}
