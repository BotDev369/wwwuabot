/**
 * Смуга керування розділу Простору — **другий рядок кожного екрана**.
 *
 * Перший рядок — знак панелі й назва розділу, другий — те, чим цей список
 * керують, третій і далі — сам список. Рядок мусить бути на кожному розділі:
 * без нього список на одних екранах починається одразу під назвою, на інших —
 * на рядок нижче, а перший знак панелі лишається сам, без пари в ряду.
 *
 * Розмітку дає **спільний** `CollectionToolbar` (`@wwwuabot/ui/collection`) —
 * той самий, що в нотаток, контактів і дошки оголошень. Тут лишається рівно те,
 * чим розділи Простору відрізняються від решти списків продукту: у них немає ні
 * сортування, ні груп, тож і пікерів немає — пошук і чипи до нього.
 *
 * **Вибір вигляду тут вимкнено** (`showViewSwitch={false}`): розкладка списку в
 * цих розділів одна, і клітинка, яка нічого не міняє, була б обіцянкою без дії
 * (§7). Двоє виглядів має лише дошка оголошень — вона й бере спільну смугу
 * напряму (`SpaceAdsToolbar`).
 *
 * **Головна дія — не тут.** «+» передає дошка оголошень (там він справді щось
 * створює); у розділів, які лише читають, акцентної клітинки немає, і це
 * навмисно: акцент у ряду означає дію, а обіцяти дію, якої немає, — гірше за
 * порожнє місце (§7).
 *
 * @module web-platform-dev/src/pages/SpaceListToolbar
 */

import type { ReactElement } from "react";
import { CollectionToolbar } from "@wwwuabot/ui/collection";
import { listChips, type SpaceListView } from "./space-list-view";

export function SpaceListToolbar({
  view,
  onChange,
  searchLabel,
  shown,
  total,
  add,
}: {
  view: SpaceListView;
  onChange: (patch: Partial<SpaceListView>) => void;
  /** За чим шукає саме цей розділ: «ім'я гри», «назва теми» — знає екран. */
  searchLabel: string;
  shown: number;
  total: number;
  add?: { label: string; onClick: () => void };
}): ReactElement {
  return (
    <CollectionToolbar
      query={view.query}
      onQueryChange={(query) => onChange({ query })}
      searchLabel={searchLabel}
      pickers={[]}
      view={{ layout: "rows", columns: 2 }}
      onViewChange={() => {}}
      showViewSwitch={false}
      {...(add ? { add } : {})}
      chips={listChips(view).map((chip) => ({
        key: chip.key,
        label: chip.label,
        action: chip.action,
        onClear: () => onChange(chip.reset),
      }))}
      filtered={{ shown, total }}
    />
  );
}
