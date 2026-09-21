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
 * **Композер відкривається звідси тим самим `ComposerModal`**, що й з «+» у
 * футері, лише на вкладці «Оголошення»: одна форма на два входи — інакше
 * дошка мала б власну, яка розійшлася б із першою першою ж правкою.
 *
 * @module web-platform-dev/src/pages/SpacePage
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { AdDraft } from "@wwwuabot/shared/ads";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { Tabs, tabId, tabPanelId } from "@wwwuabot/ui/tabs";
import { notesApi } from "@/shared/api/notes.api";
import { adDraftFrom } from "./ads-list";
import { SpaceAdsTab } from "./SpaceAdsTab";
import { SpaceUsersTab } from "./SpaceUsersTab";
import { DEFAULT_SPACE_TAB, SPACE_TABS, spaceTab, type SpaceTab } from "./space-tabs";
import { useAds } from "./useAds";
import { useSpace } from "./useSpace";

/** Що саме показує композер: `draft` немає — створюємо нове. */
interface ComposerRequest {
  draft?: AdDraft;
}

export function SpacePage(): ReactElement {
  const [tab, setTab] = useState<SpaceTab>(DEFAULT_SPACE_TAB);
  const [composer, setComposer] = useState<ComposerRequest | null>(null);
  const space = useSpace();
  const ads = useAds();
  const current = spaceTab(tab);

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Простір</h1>
      </div>

      <Tabs options={SPACE_TABS} value={tab} onChange={setTab} label="Розділи простору" />

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
