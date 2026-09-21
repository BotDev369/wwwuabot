/**
 * Смуга керування дошкою — **дошкова настройка спільної смуги**.
 *
 * Саму смугу (пошук, клітинки виборів, чипи, «+») рендерить спільний
 * `CollectionToolbar` із `@wwwuabot/ui/collection` — той самий, що в нотаток і
 * контактів. Тут лишається те, чого спільний кирпичик знати не може: **які
 * вибори бувають у дошки** (вид оголошення, чиє воно) і як звуться їхні пункти.
 *
 * **Головна дія стоїть у ряду, а не окремим блоком на всю ширину.** Доти
 * «Створити оголошення» була кнопкою на весь екран — і займала стільки ж місця,
 * скільки перше оголошення в списку. У ряду вона та сама дія, лише акцентна
 * клітинка: слово лишається в `aria-label`, бо тло в ряду виборів означає
 * **дію**, і вона там рівно одна (правило 18).
 *
 * @module web-platform-dev/src/pages/SpaceAdsToolbar
 */

import type { ReactElement } from "react";
import { AD_KIND_LABELS, adKindLabel } from "@wwwuabot/shared/ads";
import { CollectionToolbar, type ToolbarPicker } from "@wwwuabot/ui/collection";
import type { MenuItem } from "@wwwuabot/ui/menu";
import { ADS_WHOSE_OPTIONS, adsChips, adsKinds, type AdsView } from "./ads-view";
import type { SpaceAd } from "./ads-list";

/** Знаки виборів — різні навмисно: однаковий не сказав би, чим різняться дії. */
const KIND = { key: "kind", label: "Вид оголошення", icon: "tag" } as const;
const WHOSE = { key: "whose", label: "Чиї оголошення", icon: "user" } as const;

export function SpaceAdsToolbar({
  items,
  view,
  onChange,
  shown,
  onCompose,
}: {
  /** Увесь список дошки — з нього беруться види, які справді є. */
  items: readonly SpaceAd[];
  view: AdsView;
  onChange: (patch: Partial<AdsView>) => void;
  shown: number;
  /** Відкрити композер на створення — та сама форма, що з «+» у футері. */
  onCompose: () => void;
}): ReactElement {
  const kinds = adsKinds(items);
  const chosenKind = view.kind === "all" ? "Усі види" : adKindLabel(view.kind);
  const chosenWhose = ADS_WHOSE_OPTIONS.find((option) => option.value === view.whose)?.short ?? "";

  /** Пункти вибору виду: «усі» плюс те, що є на дошці. Порожніх видів немає. */
  function kindItems(): MenuItem[] {
    return [
      {
        key: "all",
        label: "Усі види",
        icon: "list",
        selected: view.kind === "all",
        onSelect: () => onChange({ kind: "all" }),
      },
      ...kinds.map((kind) => ({
        key: kind,
        label: AD_KIND_LABELS[kind],
        icon: "tag" as const,
        selected: view.kind === kind,
        onSelect: () => onChange({ kind }),
      })),
    ];
  }

  function whoseItems(): MenuItem[] {
    return ADS_WHOSE_OPTIONS.map((option) => ({
      key: option.value,
      label: option.label,
      icon: "user" as const,
      selected: view.whose === option.value,
      onSelect: () => onChange({ whose: option.value }),
    }));
  }

  const pickers: ToolbarPicker[] = [
    { ...KIND, value: chosenKind, items: kindItems() },
    { ...WHOSE, value: chosenWhose, items: whoseItems() },
  ];

  return (
    <CollectionToolbar
      query={view.query}
      onQueryChange={(query) => onChange({ query })}
      searchLabel="Пошук за текстом, ціною або містом"
      pickers={pickers}
      view={{ layout: view.layout, columns: view.columns }}
      onViewChange={(next) => onChange(next)}
      add={{ label: "Створити оголошення", onClick: onCompose }}
      chips={adsChips(view).map((chip) => ({
        key: chip.key,
        label: chip.label,
        action: chip.action,
        onClear: () => onChange(chip.reset),
      }))}
      filtered={{ shown, total: items.length }}
    />
  );
}
