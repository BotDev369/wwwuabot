/**
 * Простір — відкрита стрічка платформи.
 *
 * **Розділи стоять у лівій панелі, а не смугою зверху.** Вибір розділу — це не
 * «два погляди на те саме», а **навігація**: рядок угорі зникав після першого ж
 * екрана прокрутки, а на телефоні ще й прокручувався набік. Панель тримає вибір
 * на видноті завжди й лишає список поруч із ним. Деталі панелі — `SpaceNav`,
 * стан — `useSpaceNav`, склад розділів — `space-tabs`.
 *
 * **Заголовок і панель їдуть разом.** Панель `sticky`, тож вона лишається на
 * екрані, поки гортають дошку: перехід в інший розділ — це один дотик, а не
 * прокрутка вгору. Другого липкого шару (колишній `wb-page-sticky`) тут більше
 * немає: обидва липкі шари рухалися б один крізь одного, а місце під футер
 * лишає сам каркас сторінки.
 *
 * **Тумблер панелі стоїть у рядку назви.** Своєї шапки панель не має: вона
 * забирала рядок і словом повторювала те, що видно зі знаків. Тумблер поруч із
 * «Простір» видно в обох станах, і саме там він читається як «згорнути /
 * розгорнути розділи», а не як ще один пункт меню (`SpaceNav`).
 *
 * **Композер один на два входи** (`AdCreateSheet`): тут його відкриває «+»
 * ряду керування, а в хабі «Створити» — «+» у пункті «Оголошення», де він
 * з'являється **поверхнею на самому хабі** й нікуди не веде. Відкриття форми
 * на дошці тримає `useCreateForm`: вона — **запис історії** (`?new=1`), тож
 * «назад» закриває форму й лишає людину в дошці, а не виводить із Простору.
 *
 * @module web-platform-dev/src/pages/SpacePage
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Ad, AdDraft } from "@wwwuabot/shared/ads";
import { tabId, tabPanelId } from "@wwwuabot/ui/tabs";
import { useCreateForm } from "@/app/useCreateForm";
import { AdCreateSheet } from "./create/AdCreateSheet";
import { adDraftFrom } from "./ads-list";
import { SpaceAdsTab } from "./SpaceAdsTab";
import { SpaceThemesTab } from "./SpaceThemesTab";
import { SpaceNav } from "./SpaceNav";
import { SpaceGamesTab } from "./games/SpaceGamesTab";
import { SpaceUsersTab } from "./SpaceUsersTab";
import { SpacePagesTab } from "./user-pages/SpacePagesTab";
import { useSpaceNav } from "./useSpaceNav";
import { useAds } from "./useAds";
import { useSpace } from "./useSpace";

/** Що саме показує композер: `draft` немає — створюємо нове. */
interface ComposerRequest {
  draft?: AdDraft;
}

export function SpacePage(): ReactElement {
  // Розділ і панель приходять з адреси (`useSpaceNav`): так з хабу «Створити»
  // веде «+» — у розділ дошки й одразу у форму оголошення (`?tab=ads&new=1`).
  const nav = useSpaceNav();
  // Створення — в адресі (`useCreateForm`), правка свого оголошення — тут: вона
  // завжди про конкретний рядок, і рядок уже є в дошці.
  const form = useCreateForm();
  const [composer, setComposer] = useState<ComposerRequest | null>(null);
  const composerOpen = form.open || composer !== null;
  const space = useSpace();
  const ads = useAds();

  /** Відкрити композер: без оголошення — нове (за адресою), з ним — правка. */
  function compose(draft?: Ad): void {
    if (draft === undefined) {
      setComposer(null);
      form.openForm();
      return;
    }
    setComposer({ draft: adDraftFrom(draft) });
  }

  /** Закрити композер: правку скидаємо, форму вертаємо в адресі. */
  function closeComposer(): void {
    setComposer(null);
    form.closeForm();
  }

  const toggleLabel = nav.expanded ? "Згорнути панель розділів" : "Розгорнути панель розділів";

  return (
    <div className="wb-page wb-space-page">
      <div className="wb-space-layout">
        <SpaceNav expanded={nav.expanded} value={nav.tab} onSelect={nav.select} />

        {/* Розгорнута панель на телефоні лягає поверх вмісту: дотик по скриму
            повертає згорнутий стан — так само, як дотик по обраному розділу. */}
        {nav.expanded && <div className="wb-space-scrim" onClick={nav.toggle} aria-hidden="true" />}

        <div className="wb-space-main">
          {/* Тумблер і назва — один рядок: вони й правда про одне (цей екран і
              його розділи). Розмір знака бере з розміру назви — `1em`
              (`space.css`), тож у шапці він читається як частина заголовка. */}
          <div className="wb-page-head">
            <div className="wb-space-head">
              <button
                type="button"
                className="wb-space-toggle"
                onClick={nav.toggle}
                title={toggleLabel}
                aria-label={toggleLabel}
                aria-expanded={nav.expanded}
              >
                <Icon name="sidebar-toggle" size={20} />
              </button>

              <h1 className="wb-page-title">Простір</h1>
            </div>
          </div>

          <div id={tabPanelId(nav.tab)} role="tabpanel" aria-labelledby={tabId(nav.tab)}>
            {nav.tab === "users" && (
              <SpaceUsersTab
                items={space.items}
                loading={space.loading}
                error={space.error}
                onRetry={space.reload}
              />
            )}

            {nav.tab === "themes" && <SpaceThemesTab />}

            {nav.tab === "games" && <SpaceGamesTab />}

            {nav.tab === "pages" && <SpacePagesTab />}

            {nav.tab === "ads" && (
              <SpaceAdsTab
                items={ads.items}
                loading={ads.loading}
                error={ads.error}
                onRetry={() => ads.reload(true)}
                onCompose={compose}
                onToggle={(ad) => ads.save(adDraftFrom(ad, { isActive: !ad.isActive }))}
                onRemove={ads.remove}
              />
            )}

            {nav.current.soon && (
              /* Розділ, якого ще немає, не мовчить: він каже, що саме тут буде. */
              <div className="wb-empty">
                <span className="wb-empty-icon">
                  <Icon name="layout" size={32} />
                </span>
                <p className="wb-empty-text">{nav.current.hint}</p>
                <p className="wb-text-muted">Розділ «{nav.current.label}» ще в розробці.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {composerOpen && (
        <AdCreateSheet
          initial={composer?.draft}
          // Дошка перечитується після запису: у ній видно і своє, і чуже, а
          // показати це може лише свіжий список.
          onSaved={() => ads.reload()}
          onClose={closeComposer}
        />
      )}
    </div>
  );
}
