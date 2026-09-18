/**
 * Смуга керування списком контактів — **контактна настройка спільної смуги**.
 *
 * Саму смугу (пошук, клітинки, чипи, перемикач) рендерить спільний
 * `CollectionToolbar` із `@wwwuabot/ui/collection`; тут лишається те, чого
 * спільний кирпичик знати не може: **які саме вибори бувають у контактів** — за
 * чим сортувати, за чим групувати, що написати в підписі чипа. Нотатки роблять
 * те саме зі своїми варіантами, і розмітка в них одна, а не дві.
 *
 * Хештеги — єдиний вибір, який **не закриває** поверхню: дотик перемикає один
 * тег, бо тегів можна вибрати кілька. Сортування й групування закривають її
 * самі: людина вже побачила, що список змінився.
 *
 * @module @wwwuabot/ui/contacts
 */

import { type ReactElement } from "react";
import { type IconName } from "@wwwuabot/shared";
import {
  CollectionToolbar,
  UNTAGGED_LABEL,
  selectedTags,
  tagFilterLabel,
  toggleTagFilter,
  type ToolbarPicker,
} from "../collection";
import type { MenuItem } from "../menu";
import { CONTACT_GROUP_OPTIONS, CONTACT_SORT_OPTIONS, contactViewChips } from "./view";
import type { ContactsView } from "./types";

type Picker = "sort" | "group" | "tags";

/** Три вибори — дані, а не розмітка. Знаки різні, бо різні й дії. */
const PICKERS: readonly { key: Picker; label: string; icon: IconName }[] = [
  { key: "sort", label: "Сортування", icon: "sort" },
  { key: "group", label: "Групування", icon: "layers" },
  { key: "tags", label: "Хештеги", icon: "hash" },
];

interface ContactsToolbarProps {
  view: ContactsView;
  onChange: (patch: Partial<ContactsView>) => void;
  /** Усі хештеги списку — з них будується фільтр. */
  tags: readonly string[];
  /** Скільки контактів видно зараз і скільки всього. */
  shown: number;
  total: number;
  /** Видно зараз **усі** видимі контакти розгорнутими. */
  allOpen: boolean;
  /** Розгорнути всі контакти або згорнути всі — перемикач, а не вибір. */
  onToggleAll: () => void;
}

export function ContactsToolbar({
  view,
  onChange,
  tags,
  shown,
  total,
  allOpen,
  onToggleAll,
}: ContactsToolbarProps): ReactElement {
  const sortOption =
    CONTACT_SORT_OPTIONS.find((option) => option.value === view.sort) ?? CONTACT_SORT_OPTIONS[0];
  const groupOption =
    CONTACT_GROUP_OPTIONS.find((option) => option.value === view.groupBy) ??
    CONTACT_GROUP_OPTIONS[0];
  const chosenTags = selectedTags(view.tags);

  /** Що зараз вибрано — словами: у клітинці лише знак, тож має бути `aria-label`. */
  const chosen: Record<Picker, string> = {
    sort: sortOption.label,
    group: groupOption.label,
    tags: tagFilterLabel(view.tags),
  };

  /** Пункти поверхні: вибраний позначений галочкою (`selected`). */
  function pickerItems(key: Picker): MenuItem[] {
    if (key === "sort") {
      return CONTACT_SORT_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        icon: "sort" as const,
        selected: view.sort === option.value,
        onSelect: () => onChange({ sort: option.value }),
      }));
    }

    if (key === "group") {
      return CONTACT_GROUP_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        icon: "layers" as const,
        selected: view.groupBy === option.value,
        onSelect: () => onChange({ groupBy: option.value }),
      }));
    }

    const items: MenuItem[] = [
      {
        key: "all",
        label: "Усі контакти",
        icon: "list",
        selected: view.tags.kind === "all",
        onSelect: () => onChange({ tags: { kind: "all" } }),
      },
      {
        key: "untagged",
        label: UNTAGGED_LABEL,
        icon: "minus",
        selected: view.tags.kind === "untagged",
        onSelect: () => onChange({ tags: { kind: "untagged" } }),
      },
    ];
    for (const tag of tags) {
      items.push({
        key: `tag:${tag}`,
        label: `#${tag}`,
        icon: "hash",
        selected: chosenTags.includes(tag),
        onSelect: () => onChange({ tags: toggleTagFilter(view.tags, tag) }),
      });
    }
    return items;
  }

  const pickers: ToolbarPicker[] = PICKERS.map(({ key, label, icon }) => ({
    key,
    label,
    icon,
    value: chosen[key],
    items: pickerItems(key),
    hint: key === "tags" ? "Можна вибрати кілька — контакт мусить мати всі" : undefined,
    closeOnSelect: key !== "tags",
  }));

  return (
    <CollectionToolbar
      query={view.query}
      onQueryChange={(query) => onChange({ query })}
      searchLabel="Пошук за іменем, хендлом або хештегом"
      pickers={pickers}
      view={{ layout: view.layout, columns: view.columns }}
      onViewChange={(next) => onChange(next)}
      toggleAll={{ open: allOpen, onToggle: onToggleAll, what: "контакти" }}
      chips={contactViewChips(view).map((chip) => ({
        key: chip.key,
        label: chip.label,
        action: chip.action,
        onClear: () => onChange(chip.reset),
      }))}
      filtered={{ shown, total }}
    />
  );
}
