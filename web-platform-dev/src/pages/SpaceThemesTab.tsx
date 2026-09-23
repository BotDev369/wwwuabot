/**
 * «Теми» — вкладка Простору: теми, які люди відкрили для всіх.
 *
 * **Простір — це стрічка всього, що створюють.** Люди, оголошення, сторінки — і
 * теми: тема з відкритим перемикачем «Доступна публічно» з'являється тут сама.
 * Тому вкладка не має власного списку: вона читає ту саму бібліотеку, що й
 * розділ теми (`useSharedThemes`), а показує її тим самим списком (`SchemeList`).
 *
 * **Смуга керування стоїть другим рядком** — як у кожному розділі Простору:
 * перший рядок — знак панелі й назва, другий — те, чим список керують, далі —
 * список. Тут це пошук за назвою теми й шрифтом.
 *
 * **Взяти тему собі — один дотик.** Тут не потрібно нічого копіювати: тема
 * складається з трьох кольорів і шрифту, тож «взяти» — це застосувати її до
 * себе (спільна `applyThemeScheme`), а не заводити другий рядок у базі.
 *
 * @module web-platform-dev/src/pages/SpaceThemesTab
 */

import { useState, type ReactElement } from "react";
import { fontLabel } from "@wwwuabot/shared";
import { SpaceListEmpty } from "./SpaceListEmpty";
import { SpaceListToolbar } from "./SpaceListToolbar";
import { DEFAULT_SPACE_LIST_VIEW, filterByQuery, type SpaceListView } from "./space-list-view";
import { SchemeList } from "./themes/SchemeList";
import { useAppliedScheme } from "./themes/useAppliedScheme";
import { useSharedThemes } from "./themes/useSharedThemes";

export function SpaceThemesTab(): ReactElement {
  const themes = useSharedThemes();
  const { applied, apply } = useAppliedScheme();
  const [view, setView] = useState<SpaceListView>(DEFAULT_SPACE_LIST_VIEW);

  // Шукаємо за тим, що видно на картці: назва теми й шрифт (підпис під нею).
  const visible = filterByQuery(themes.items, view.query, (scheme) => [
    scheme.name,
    fontLabel(scheme.font),
  ]);
  const change = (patch: Partial<SpaceListView>): void =>
    setView((prev) => ({ ...prev, ...patch }));
  const hasItems = !themes.loading && !themes.error && themes.items.length > 0;

  return (
    <>
      {/* Смуга є лише тоді, коли є що звужувати: на порожньому розділі вона
          обіцяла б пошук у нічому. */}
      {hasItems && (
        <SpaceListToolbar
          view={view}
          onChange={change}
          searchLabel="Пошук за назвою теми або шрифтом"
          shown={visible.length}
          total={themes.items.length}
        />
      )}

      {/* Пошук звузив усе — і це видно словами: «тем немає» без причини читалось
          би як порожній Простір, а не як звужений список. */}
      {hasItems && visible.length === 0 ? (
        <SpaceListEmpty onReset={() => change(DEFAULT_SPACE_LIST_VIEW)} />
      ) : (
        <SchemeList
          items={visible}
          loading={themes.loading}
          error={themes.error}
          onRetry={() => themes.reload(true)}
          applied={applied}
          onApply={apply}
          empty={{
            icon: "palette",
            title: "Поки ніхто не поділився темою.",
            hint: "Тема з'являється тут, щойно її автор увімкне «Доступна публічно».",
          }}
        />
      )}
    </>
  );
}
