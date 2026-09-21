/**
 * Простір — відкрита стрічка платформи.
 *
 * **Люди — перший розділ.** Профіль з'являється тут сам, щойно людина зробить
 * його публічним у себе в акаунті; оголошення й сторінки прийдуть наступними
 * вкладками. Порядок саме такий: перша вкладка мусить мати що показати, інакше
 * Простір зустрічає людину порожнім екраном.
 *
 * **Смуга — спільний кирпичик** (`@wwwuabot/ui/tabs`): ті самі вкладки, що в
 * розділах акаунта. Розділ, якого ще немає, стоїть **видимим** і чесно каже,
 * що там буде, — ховати його означало б обіцяти, що далі порожньо.
 *
 * @module web-platform-dev/src/pages/SpacePage
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { Tabs, tabId, tabPanelId } from "@wwwuabot/ui/tabs";
import { SpaceUsersTab } from "./SpaceUsersTab";
import { DEFAULT_SPACE_TAB, SPACE_TABS, spaceTab, type SpaceTab } from "./space-tabs";
import { useSpace } from "./useSpace";

export function SpacePage(): ReactElement {
  const [tab, setTab] = useState<SpaceTab>(DEFAULT_SPACE_TAB);
  const space = useSpace();
  const current = spaceTab(tab);

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Простір</h1>
      </div>

      <Tabs options={SPACE_TABS} value={tab} onChange={setTab} label="Розділи простору" />

      <div id={tabPanelId(tab)} role="tabpanel" aria-labelledby={tabId(tab)}>
        {tab === "users" ? (
          <SpaceUsersTab
            items={space.items}
            loading={space.loading}
            error={space.error}
            onRetry={space.reload}
          />
        ) : (
          /* Розділ, якого ще немає, не мовчить: він каже, що саме тут буде. */
          <div className="wb-empty">
            <span className="wb-empty-icon">
              <Icon name={current.key === "ads" ? "feed" : "layout"} size={32} />
            </span>
            <p className="wb-empty-text">{current.hint}</p>
            <p className="wb-text-muted">Розділ «{current.label}» ще в розробці.</p>
          </div>
        )}
      </div>
    </div>
  );
}
