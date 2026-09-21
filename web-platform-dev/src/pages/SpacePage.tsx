/**
 * Простір — відкрита стрічка платформи.
 *
 * **Люди — перший розділ.** Профіль з'являється тут сам, щойно людина зробить
 * його публічним у себе в акаунті; оголошення пишуть самі люди, а сторінки
 * прийдуть наступною вкладкою. Порядок саме такий: перша вкладка мусить мати
 * що показати, інакше Простір зустрічає людину порожнім екраном.
 *
 * **Смуга — спільний кирпичик** (`@wwwuabot/ui/tabs`): ті самі вкладки, що в
 * розділах акаунта. Розділ, якого ще немає, стоїть **видимим** і чесно каже,
 * що там буде, — ховати його означало б обіцяти, що далі порожньо.
 *
 * **Заголовок і вкладки їдуть разом** (`.wb-page-sticky`): у стрічці гортають
 * униз, і без цього смуга зникала б після першого ж екрана — рівно тоді, коли
 * треба перейти в інший розділ. Той самий каркас, що в нотаток і контактів.
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
import { useSearchParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import type { Ad, AdDraft } from "@wwwuabot/shared/ads";
import { Tabs, tabId, tabPanelId } from "@wwwuabot/ui/tabs";
import { useCreateForm } from "@/app/useCreateForm";
import { AdCreateSheet } from "./create/AdCreateSheet";
import { adDraftFrom } from "./ads-list";
import { SpaceAdsTab } from "./SpaceAdsTab";
import { SpaceThemesTab } from "./SpaceThemesTab";
import { SpaceGamesTab } from "./games/SpaceGamesTab";
import { SpaceUsersTab } from "./SpaceUsersTab";
import { SPACE_TABS, SPACE_TAB_PARAM, readSpaceTab, spaceTab, type SpaceTab } from "./space-tabs";
import { useAds } from "./useAds";
import { useSpace } from "./useSpace";

/** Що саме показує композер: `draft` немає — створюємо нове. */
interface ComposerRequest {
  draft?: AdDraft;
}

export function SpacePage(): ReactElement {
  // Розділ і форма можуть прийти **адресою**: так з хабу «Створити» веде
  // «+» — у розділ дошки й одразу у форму оголошення (`?tab=ads&new=1`).
  // Адреса — це вхід, а не стан: усе читається один раз, при появі екрана.
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<SpaceTab>(() => readSpaceTab(searchParams.get(SPACE_TAB_PARAM)));
  // Створення — в адресі (`useCreateForm`), правка свого оголошення — тут: вона
  // завжди про конкретний рядок, і рядок уже є в дошці.
  const form = useCreateForm();
  const [composer, setComposer] = useState<ComposerRequest | null>(null);
  const composerOpen = form.open || composer !== null;
  const space = useSpace();
  const ads = useAds();
  const current = spaceTab(tab);

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

  return (
    <div className="wb-page">
      {/* Проміжки тут — самого шару (`gap` і `padding`): окремі `margin` у
          заголовка й смуги дали б подвійну прогалину під шапкою. */}
      <div className="wb-page-sticky">
        <div className="wb-page-head">
          <h1 className="wb-page-title">Простір</h1>
        </div>

        <Tabs options={SPACE_TABS} value={tab} onChange={setTab} label="Розділи простору" />
      </div>

      <div id={tabPanelId(tab)} role="tabpanel" aria-labelledby={tabId(tab)}>
        {tab === "users" && (
          <SpaceUsersTab
            items={space.items}
            loading={space.loading}
            error={space.error}
            onRetry={space.reload}
          />
        )}

        {tab === "themes" && <SpaceThemesTab />}

        {tab === "games" && <SpaceGamesTab />}

        {tab === "ads" && (
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

        {current.soon && (
          /* Розділ, якого ще немає, не мовчить: він каже, що саме тут буде. */
          <div className="wb-empty">
            <span className="wb-empty-icon">
              <Icon name="layout" size={32} />
            </span>
            <p className="wb-empty-text">{current.hint}</p>
            <p className="wb-text-muted">Розділ «{current.label}» ще в розробці.</p>
          </div>
        )}
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
