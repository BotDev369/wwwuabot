/**
 * Своя сторінка — перегляд, перемикач і дії в одному місці.
 *
 * **Адреса, а не поверхня.** За рядком списку стоїть сторінка: на неї дивляться
 * довше, з неї мусить бути видно, куди прийшов, «назад» — вертати в список, а
 * посилання — надсилатись. Слот, який відкриває модалку, цього не вміє.
 *
 * **Сторінка тут — та сама, що назовні.** Її рендерить `PageRenderer` з тієї ж
 * `page_data`, яку будує `buildPageConfig`: приватна відрізняється від
 * публічної **одним прапорцем**, а не іншим поданням. Так автор бачить те, що
 * побачить інший, і не мусить уявляти це з форми.
 *
 * **Правка тексту — сусідня адреса, а не стан цього екрана** (`/pages/:id/edit`):
 * правити текст можна довго, і «назад» із правки вертає саме на перегляд, а не
 * в список; тут же лишаються дії над сторінкою цілком — показати назовні,
 * увімкнути публічність, видалити.
 *
 * **Стан показується після відповіді сервера.** Увімкнений перемикач, який не
 * зберігся, — найгірше з можливого: людина вважала б сторінку відкритою, а
 * вона закрита (`docs/SPACE.md`).
 *
 * **Адміни — теж налаштування сторінки, і стоять тут же.** Магазин веде не одна
 * людина: власник додає тих, хто разом із ним бачить товари, **замовлення** й
 * повідомлення покупців. Прибирати їх може тільки власник, тож в адміна кнопок
 * немає — сама картка лишається: людина мусить бачити, хто ще тут є
 * (`docs/SHOPS.md` §8).
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import { type ReactElement } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { Icon, SwitchRow } from "@wwwuabot/shared";
import { toWebPath } from "@wwwuabot/shared/content";
import {
  adminIdError,
  buildPageConfig,
  pageAdminsOf,
  pageDraft,
  pageTemplate,
  type UserPage,
} from "@wwwuabot/shared/pages";
import { PageRenderer } from "@wwwuabot/ui/PageRenderer";
import { registerAllBlocks } from "@wwwuabot/ui/blocks";
import { useDialog } from "@wwwuabot/ui/dialog";
import { productCards } from "@wwwuabot/shared/shop";
import { PAGES_PATH, shopProductEditPath, userPageEditPath } from "@/app/routes";
import { ShopPanel } from "@/pages/shop/ShopPanel";
import { useShopProducts } from "@/pages/shop/useShopProducts";
import { pagesApi } from "@/shared/api/pages.api";
import { PageState } from "./PageState";
import {
  accessHint,
  pageAddressLabel,
  staffLabel,
  staffMemberLabel,
  visibilityLabel,
} from "./pages-view";
import { useUserPage } from "./useUserPage";

registerAllBlocks();

export function UserPageView(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dialog = useDialog();
  const { pathname } = useLocation();
  const { page, loading, error, pages } = useUserPage(id);

  // Назва сторінки, її посилання й серце живуть у хедері: це речі про саму
  // сторінку, а не про редактор, у якому вона відкрита.
  useScreenChrome({
    title: page?.title ?? null,
    shareUrl: page ? pathname : null,
    favorite: page ? { kind: "page", targetId: page.id } : null,
  });

  // Товари належать магазину (`shop_id` — номер цієї ж сторінки), а живуть вони
  // в окремій таблиці, тож сторінка питає їх окремо (docs/SHOPS.md §1). Питають
  // **лише** в магазину: решті шаблонів `useShopProducts(null)` не робить
  // жодного запиту. Один виклик хука на екран — з нього ж береться й сітка
  // вітрини нижче.
  const shopId = page && page.template === "shop" ? page.id : null;
  const shop = useShopProducts(shopId);

  async function togglePublic(next: boolean): Promise<void> {
    if (!page) return;
    try {
      const saved = await pagesApi.save({ ...pageDraft(page), isPublic: next });
      if (saved) pages.upsert(saved);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося змінити видимість", {
        title: "Помилка",
      });
    }
  }

  /**
   * Склад адмінів — та сама чернетка, що шле перемикач публічності: у ній
   * `admins` уже лежать, тож перемикання доступу не затирає видимість, і навпаки.
   */
  async function saveAdmins(next: number[]): Promise<void> {
    if (!page) return;
    try {
      const saved = await pagesApi.save({ ...pageDraft(page), admins: next });
      if (saved) pages.upsert(saved);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося змінити доступ", {
        title: "Помилка",
      });
    }
  }

  /**
   * Адміна додають **Telegram-ID**, а не іменем: імені в продукті два (наше й
   * телеграмне), і вгадане ім'я віддало б доступ не тій людині.
   *
   * Помилку в номері показує сам діалог (`adminIdError`), а не повідомлення
   * після запису: сервер теж перевірив би, але людині це вже нічого не сказало б.
   */
  async function addAdmin(): Promise<void> {
    if (!page) return;
    const current = pageAdminsOf(page);
    const raw = await dialog.prompt("Telegram ID адміністратора", {
      title: "Додати адміна",
      placeholder: "Напр. 1049272067",
      validate: (value) => adminIdError(value, current),
    });
    if (raw === null) return;
    await saveAdmins([...current, Number(raw.trim())]);
  }

  async function deletePage(target: UserPage): Promise<void> {
    const confirmed = await dialog.confirm(`Видалити сторінку «${target.title}»?`, {
      title: "Видалення",
      tone: "danger",
      confirmText: "Видалити",
    });
    if (!confirmed) return;

    try {
      await pagesApi.remove(target.id);
      pages.remove(target.id);
      await navigate(PAGES_PATH, { replace: true });
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося видалити сторінку", {
        title: "Помилка",
      });
    }
  }

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
          {/* Картка магазину стоїть **перед** налаштуваннями сторінки: у
              магазині головне — товари, і без неї власник бачив би на своїй
              сторінці рівно текст вітрини, ніби товарів і не існує
              (`pages/shop/ShopPanel`). */}
          {shopId !== null && (
            <ShopPanel
              pageId={page.id}
              loading={shop.loading}
              count={shop.products.length}
              error={shop.error}
            />
          )}

          <div className="wb-card">
            <div className="wb-card-body">
              <SwitchRow
                label="Публічна сторінка"
                hint={page.isPublic ? "Видно всім у Просторі" : "Видно лише вам"}
                checked={page.isPublic}
                onToggle={(next) => void togglePublic(next)}
              />

              {/* Адреса — це те, чим сторінку показують іншим, тож вона стоїть
                  тут, а не «десь у редакторі». Приватна теж має адресу: вона
                  вже зайнята і чекає на перемикач. */}
              <p className="wb-text-muted">
                {visibilityLabel(page.isPublic)} · {pageAddressLabel(page)}
              </p>

              <div className="wb-sheet-actions">
                {page.isPublic && (
                  <button
                    type="button"
                    className="wb-btn wb-btn-secondary"
                    onClick={() => void navigate(toWebPath(page.slug))}
                  >
                    <Icon name="external-link" size={16} />
                    Відкрити
                  </button>
                )}
                <button
                  type="button"
                  className="wb-btn wb-btn-secondary"
                  onClick={() => void navigate(userPageEditPath(page.id))}
                >
                  <Icon name="edit" size={16} />
                  Змінити текст
                </button>
                <button
                  type="button"
                  className="wb-btn wb-btn-ghost"
                  onClick={() => void deletePage(page)}
                >
                  <Icon name="trash" size={16} />
                  Видалити
                </button>
              </div>
            </div>
          </div>

          {/* Доступ — налаштування сторінки, тож стоїть поруч із видимістю.
              Власник і адміни бачать товари й **замовлення** цієї сторінки;
              роздає доступ тільки власник, тому в адміна тут немає кнопок
              (`docs/SHOPS.md` §8). */}
          <div className="wb-card">
            <div className="wb-card-header">
              <span className="wb-card-title">
                <Icon name="lock" size={16} />
                Доступ
              </span>
            </div>
            <div className="wb-card-body">
              <p className="wb-text-muted">{staffLabel(page)}</p>
              <p className="wb-text-muted">{accessHint(page)}</p>

              {page.role === "owner" && (
                <div className="wb-sheet-actions">
                  {page.staff
                    .filter((member) => member.role === "admin")
                    .map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className="wb-btn wb-btn-ghost"
                        onClick={() =>
                          void saveAdmins(pageAdminsOf(page).filter((id) => id !== member.id))
                        }
                      >
                        <Icon name="trash" size={16} />
                        Прибрати: {staffMemberLabel(member)}
                      </button>
                    ))}
                  <button
                    type="button"
                    className="wb-btn wb-btn-secondary"
                    onClick={() => void addAdmin()}
                  >
                    <Icon name="plus" size={16} />
                    Додати адміна
                  </button>
                </div>
              )}
            </div>
          </div>

          <PageRenderer
            config={buildPageConfig(pageTemplate(page.template), page.values)}
            context={{
              slug: page.slug,
              title: page.title,
              photoUrl: null,
              // Сітка вітрини бере товари звідси: у `page_data` їх немає.
              // Чернетки відсіює `productCards`, тож власник бачить рівно те,
              // що побачить покупець (docs/SHOPS.md §3).
              shopCards: shopId === null ? undefined : productCards(shop.products, shop.media),
              // Плитка товару веде в правку цього товару. Без цієї дії сітка на
              // власній сторінці виглядала як макет: продавець бачив свої
              // товари, тап по них нічого не робив, і фото не було де змінити.
              shopEditProduct:
                shopId === null
                  ? undefined
                  : (productId: number) => void navigate(shopProductEditPath(page.id, productId)),
            }}
            className="page-layout"
          />
        </>
      )}
    </div>
  );
}
