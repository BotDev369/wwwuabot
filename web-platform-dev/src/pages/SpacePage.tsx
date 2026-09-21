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
 * **Композер відкривається звідси тим самим `ComposerModal`**, що й у нотаток,
 * лише на вкладці «Оголошення»: одна форма на два входи — інакше дошка мала б
 * власну, яка розійшлася б із першою першою ж правкою. Сюди ж веде «+» із хабу
 * створення — адресою `/space?tab=ads&new=1`, тож і розділ, і форма
 * відкриваються з посилання, а не з другого коду. Намір читає
 * `useCreateIntent`, він же лишає адресу розділом — `/space?tab=ads`.
 *
 * @module web-platform-dev/src/pages/SpacePage
 */

import { useState, type ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import type { AdDraft } from "@wwwuabot/shared/ads";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { Tabs, tabId, tabPanelId } from "@wwwuabot/ui/tabs";
import { useCreateIntent } from "@/app/useCreateIntent";
import { notesApi } from "@/shared/api/notes.api";
import { adDraftFrom } from "./ads-list";
import { SpaceAdsTab } from "./SpaceAdsTab";
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
  // Намір читає хук і він же лишає в адресі сам розділ (`?tab=ads`): форма —
  // стан екрана, а не другий бік адреси.
  const wantsCompose = useCreateIntent();
  const [composer, setComposer] = useState<ComposerRequest | null>(() =>
    wantsCompose ? {} : null,
  );
  const space = useSpace();
  const ads = useAds();
  const current = spaceTab(tab);

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

        {tab === "ads" && (
          <SpaceAdsTab
            items={ads.items}
            loading={ads.loading}
            error={ads.error}
            onRetry={() => ads.reload(true)}
            onCompose={(draft) =>
              setComposer(draft === undefined ? {} : { draft: adDraftFrom(draft) })
            }
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

      {composer && (
        <ComposerModal
          initialTab="ad"
          initialAd={composer.draft}
          onSaveAd={ads.save}
          /* Обгортка, а не сам `notesApi.save`: композер чекає на «зберегти й
             нічого не повертати», а нотатки віддають збережений рядок. */
          onSaveNote={async (draft) => {
            await notesApi.save(draft);
          }}
          onClose={() => setComposer(null)}
        />
      )}
    </div>
  );
}
