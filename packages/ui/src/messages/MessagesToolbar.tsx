/**
 * Смуга керування списком розмов — **розмовна настройка спільної смуги**.
 *
 * Саму смугу (пошук, клітинки, чипи, перемикач вигляду) рендерить спільний
 * `CollectionToolbar` із `@wwwuabot/ui/collection`; тут лишається те, чого
 * спільний кирпичик знати не може: **які саме вибори бувають у розмов** — за
 * чим сортувати, за чим групувати, що звужувати. Нотатки й контакти роблять те
 * саме зі своїми варіантами, і розмітка в них одна, а не три.
 *
 * Перемикача «розгорнути все» тут немає навмисно: рядок розмови не акордеон —
 * дотик до нього **відкриває переписку**, і другий стан у тому ж жесті забрав
 * би в людини головну дію екрана.
 *
 * @module @wwwuabot/ui/messages
 */

import { type ReactElement } from "react";
import { type IconName } from "@wwwuabot/shared";
import { CollectionToolbar, type ToolbarPicker } from "../collection";
import type { MenuItem } from "../menu";
import {
  MESSAGE_FILTER_OPTIONS,
  MESSAGE_GROUP_OPTIONS,
  MESSAGE_SORT_OPTIONS,
  conversationViewChips,
} from "./view";
import type { MessagesToolbarProps } from "./types";

type Picker = "filter" | "sort" | "group";

/** Три вибори — дані, а не розмітка. Знаки різні, бо різні й дії. */
const PICKERS: readonly { key: Picker; label: string; icon: IconName }[] = [
  { key: "filter", label: "Що показати", icon: "filter" },
  { key: "sort", label: "Сортування", icon: "sort" },
  { key: "group", label: "Групування", icon: "layers" },
];

export function MessagesToolbar({
  view,
  onChange,
  shown,
  total,
  onNew,
}: MessagesToolbarProps): ReactElement {
  const filterOption =
    MESSAGE_FILTER_OPTIONS.find((option) => option.value === view.filter) ??
    MESSAGE_FILTER_OPTIONS[0];
  const sortOption =
    MESSAGE_SORT_OPTIONS.find((option) => option.value === view.sort) ?? MESSAGE_SORT_OPTIONS[0];
  const groupOption =
    MESSAGE_GROUP_OPTIONS.find((option) => option.value === view.groupBy) ??
    MESSAGE_GROUP_OPTIONS[0];

  /** Що зараз вибрано — словами: у клітинці лише знак, тож має бути `aria-label`. */
  const chosen: Record<Picker, string> = {
    filter: filterOption.label,
    sort: sortOption.label,
    group: groupOption.label,
  };

  /** Пункти поверхні: вибраний позначений галочкою (`selected`). */
  function pickerItems(key: Picker): MenuItem[] {
    if (key === "filter") {
      return MESSAGE_FILTER_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        icon: "filter" as const,
        selected: view.filter === option.value,
        onSelect: () => onChange({ filter: option.value }),
      }));
    }

    if (key === "sort") {
      return MESSAGE_SORT_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        icon: "sort" as const,
        selected: view.sort === option.value,
        onSelect: () => onChange({ sort: option.value }),
      }));
    }

    return MESSAGE_GROUP_OPTIONS.map((option) => ({
      key: option.value,
      label: option.label,
      icon: "layers" as const,
      selected: view.groupBy === option.value,
      onSelect: () => onChange({ groupBy: option.value }),
    }));
  }

  const pickers: ToolbarPicker[] = PICKERS.map(({ key, label, icon }) => ({
    key,
    label,
    icon,
    value: chosen[key],
    items: pickerItems(key),
  }));

  return (
    <CollectionToolbar
      query={view.query}
      onQueryChange={(query) => onChange({ query })}
      searchLabel="Пошук за іменем, хендлом або текстом останнього повідомлення"
      pickers={pickers}
      view={{ layout: view.layout, columns: view.columns }}
      onViewChange={(next) => onChange(next)}
      // Дія списку: створити **нове** повідомлення. Список розмов — це вже «кому
      // я можу писати», тож дія відкриває вибір людини, а не порожній екран.
      add={{ label: "Нове повідомлення", onClick: onNew }}
      chips={conversationViewChips(view).map((chip) => ({
        key: chip.key,
        label: chip.label,
        action: chip.action,
        onClear: () => onChange(chip.reset),
      }))}
      filtered={{ shown, total }}
    />
  );
}
