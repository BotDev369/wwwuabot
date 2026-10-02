/**
 * `ThemeColorTabs` — три джерела кольорів усередині пункту «Кольори теми».
 *
 * **Смуга — спільний кирпичик** (`@wwwuabot/ui/tabs`), як у Просторі й
 * акаунті: вкладки тут не розділи, а три погляди на одне місце — колір.
 *
 * **Списки приходять аргументом.** Меню читає обидві бібліотеки по одному разу
 * (вкладка показує їх, а другий рядок пункту — назву теми, яка діє), тому
 * вкладка не читає нічого сама: два читання одного списку означали б два
 * скелета, що з'являються не в такт.
 *
 * @module web-platform-dev/src/pages/themes/ThemeColorTabs
 */

import type { ReactElement } from "react";
import { Tabs, tabId, tabPanelId } from "@wwwuabot/ui/tabs";
import type { ApplicableScheme } from "@wwwuabot/shared/themes/apply";
import type { ThemeScheme } from "@wwwuabot/shared/themes";
import { COLOR_TABS, type ColorTab } from "./color-tabs";
import { MyThemesPanel } from "./MyThemesPanel";
import { PlatformThemesPanel } from "./PlatformThemesPanel";
import { SharedThemesPanel } from "./SharedThemesPanel";
import type { AppliedLook } from "./useAppliedScheme";
import type { ThemeLibrary, MyThemesLibrary } from "./theme-library";

export interface ThemeColorTabsProps {
  value: ColorTab;
  onChange: (tab: ColorTab) => void;
  /** Що стоїть на екрані зараз — щоб картка могла сказати «застосовано». */
  applied: AppliedLook;
  mine: MyThemesLibrary;
  shared: ThemeLibrary;
  /** Взяти схему собі: колори й шрифт ідуть у чернетку панелі. */
  onApply: (scheme: ApplicableScheme) => void;
  /** Відкрити редактор теми: нова (`null`) або правка цієї. */
  onEdit: (scheme: ThemeScheme | null) => void;
}

export function ThemeColorTabs({
  value,
  onChange,
  applied,
  mine,
  shared,
  onApply,
  onEdit,
}: ThemeColorTabsProps): ReactElement {
  return (
    <>
      <Tabs options={COLOR_TABS} value={value} onChange={onChange} label="Джерела кольорів" />

      <div id={tabPanelId(value)} role="tabpanel" aria-labelledby={tabId(value)}>
        {value === "templates" && <PlatformThemesPanel applied={applied} onApply={onApply} />}
        {value === "mine" && (
          <MyThemesPanel
            list={mine}
            applied={applied}
            onApply={onApply}
            onEdit={onEdit}
            onCreate={() => onEdit(null)}
          />
        )}
        {value === "public" && (
          <SharedThemesPanel
            list={shared}
            applied={applied}
            onApply={onApply}
            onCreate={() => onEdit(null)}
          />
        )}
      </div>
    </>
  );
}
