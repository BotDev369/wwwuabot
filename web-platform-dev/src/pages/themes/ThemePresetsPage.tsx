/**
 * `/profile/theme/presets` — готові теми: три джерела під однією смугою.
 *
 * **Одна сутність — тема, три вкладки.** Платформа, свої, з простору: поділ на
 * окремі екрани змушував би людину вгадувати, де шукати «ту саму», а так вона
 * бачить усе, що є, перемикаючись одним дотиком.
 *
 * **Смуга — спільний кирпичик** (`@wwwuabot/ui/tabs`), як у Просторі й
 * акаунті. Вкладка може приїхати адресою (`?tab=mine`) — так веде «До готових
 * тем» із налаштувань; далі нею керує стан, тож закриття екрана не тягне її
 * назад із того самого посилання.
 *
 * **Пояснень під заголовком немає.** Що робить вкладка, каже її підпис і самі
 * картки; абзац над ними читають один раз, а місце він займає щоразу.
 *
 * @module web-platform-dev/src/pages/themes/ThemePresetsPage
 */

import { useState, type ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, tabId, tabPanelId } from "@wwwuabot/ui/tabs";
import { MyThemesPanel } from "./MyThemesPanel";
import { PlatformThemesPanel } from "./PlatformThemesPanel";
import { SharedThemesPanel } from "./SharedThemesPanel";
import { PRESET_TABS, PRESET_TAB_PARAM, readPresetTab, type PresetTab } from "./presets-tabs";

export function ThemePresetsPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<PresetTab>(() =>
    readPresetTab(searchParams.get(PRESET_TAB_PARAM)),
  );

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Готові теми</h1>
      </div>

      <Tabs options={PRESET_TABS} value={tab} onChange={setTab} label="Джерела тем" />

      <div id={tabPanelId(tab)} role="tabpanel" aria-labelledby={tabId(tab)}>
        {tab === "platform" && <PlatformThemesPanel />}
        {tab === "mine" && <MyThemesPanel />}
        {tab === "space" && <SharedThemesPanel />}
      </div>
    </div>
  );
}
