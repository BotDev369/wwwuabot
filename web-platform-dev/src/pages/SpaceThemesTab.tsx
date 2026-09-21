/**
 * «Теми» — вкладка Простору: теми, які люди відкрили для всіх.
 *
 * **Простір — це стрічка всього, що створюють.** Люди, оголошення, сторінки — і
 * теми: тема з відкритим перемикачем «Доступна публічно» з'являється тут сама.
 * Тому вкладка не має власного списку: вона читає ту саму бібліотеку, що й
 * розділ теми (`useSharedThemes`), а показує її тим самим списком (`SchemeList`).
 *
 * **Взяти тему собі — один дотик.** Тут не потрібно нічого копіювати: тема
 * складається з трьох кольорів і шрифту, тож «взяти» — це застосувати її до
 * себе (спільна `applyThemeScheme`), а не заводити другий рядок у базі.
 *
 * @module web-platform-dev/src/pages/SpaceThemesTab
 */

import type { ReactElement } from "react";
import { SchemeList } from "./themes/SchemeList";
import { useAppliedScheme } from "./themes/useAppliedScheme";
import { useSharedThemes } from "./themes/useSharedThemes";

export function SpaceThemesTab(): ReactElement {
  const themes = useSharedThemes();
  const { applied, apply } = useAppliedScheme();

  return (
    <SchemeList
      items={themes.items}
      loading={themes.loading}
      error={themes.error}
      onRetry={() => themes.reload(true)}
      applied={applied}
      onApply={apply}
      empty={{
        icon: "sparkles",
        title: "Поки ніхто не поділився темою.",
        hint: "Тема з'являється тут, щойно її автор увімкне «Доступна публічно».",
      }}
    />
  );
}
