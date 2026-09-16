/**
 * Смуга керування списком нотаток: пошук і три вибори — сортування, групування,
 * фільтр за хештегами.
 *
 * Вибори **не** випадають списком (правило 4): кожен відкриває ту саму
 * повноекранну поверхню, що й меню профілю (`MenuModal`), і вибраний варіант
 * позначений галочкою — бо це стан, а не перехід. Так на телефоні не треба
 * влучати в дрібну стрілку, а «що зараз вибрано» видно зі самої кнопки.
 *
 * @module @wwwuabot/ui/notes
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal, type MenuItem } from "../menu";
import type { NotesGroupBy, NotesSort, NotesTagFilter, NotesView } from "./types";
import { DEFAULT_NOTES_VIEW } from "./types";
import { GROUP_OPTIONS, SORT_OPTIONS, UNTAGGED_LABEL, isDefaultView } from "./view";

type Picker = "sort" | "group" | "tags";

interface NotesToolbarProps {
  view: NotesView;
  onChange: (patch: Partial<NotesView>) => void;
  /** Усі хештеги списку — з них будується фільтр. */
  tags: readonly string[];
  /** Скільки нотаток видно зараз і скільки всього. */
  shown: number;
  total: number;
}

const PICKER_TITLES: Record<Picker, string> = {
  sort: "Сортування",
  group: "Групування",
  tags: "Хештеги",
};

export function NotesToolbar({
  view,
  onChange,
  tags,
  shown,
  total,
}: NotesToolbarProps): ReactElement {
  const [picker, setPicker] = useState<Picker | null>(null);

  const sortOption = SORT_OPTIONS.find((option) => option.value === view.sort) ?? SORT_OPTIONS[0];
  const groupOption =
    GROUP_OPTIONS.find((option) => option.value === view.groupBy) ?? GROUP_OPTIONS[0];
  const tagLabel =
    view.tags.kind === "all"
      ? "Усі теги"
      : view.tags.kind === "untagged"
        ? UNTAGGED_LABEL
        : `#${view.tags.tag}`;

  /** Пункти пікера: вибраний позначений галочкою (`selected`). */
  function pickerItems(): MenuItem[] {
    if (picker === "sort") {
      return SORT_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        icon: "list" as const,
        selected: view.sort === option.value,
        onSelect: () => changeSort(option.value),
      }));
    }
    if (picker === "group") {
      return GROUP_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        icon: "blocks" as const,
        selected: view.groupBy === option.value,
        onSelect: () => changeGroup(option.value),
      }));
    }
    const items: MenuItem[] = [
      {
        key: "all",
        label: "Усі нотатки",
        icon: "list",
        selected: view.tags.kind === "all",
        onSelect: () => changeTags({ kind: "all" }),
      },
      {
        key: "untagged",
        label: UNTAGGED_LABEL,
        icon: "minus",
        selected: view.tags.kind === "untagged",
        onSelect: () => changeTags({ kind: "untagged" }),
      },
    ];
    for (const tag of tags) {
      items.push({
        key: `tag:${tag}`,
        label: `#${tag}`,
        icon: "hash",
        selected: view.tags.kind === "tag" && view.tags.tag === tag,
        onSelect: () => changeTags({ kind: "tag", tag }),
      });
    }
    return items;
  }

  // Кожен вибір закриває пікер: інакше людина мусила б закривати його сама,
  // хоча вже побачила, що список змінився.
  const changeSort = (sort: NotesSort) => {
    onChange({ sort });
    setPicker(null);
  };
  const changeGroup = (groupBy: NotesGroupBy) => {
    onChange({ groupBy });
    setPicker(null);
  };
  const changeTags = (next: NotesTagFilter) => {
    onChange({ tags: next });
    setPicker(null);
  };

  const filtered = !isDefaultView(view);

  return (
    <div className="wb-note-tools">
      <div className="wb-note-search">
        <Icon name="search" size={18} className="wb-note-search-icon" />
        <input
          type="search"
          className="wb-input"
          value={view.query}
          onChange={(event) => onChange({ query: event.target.value })}
          placeholder="Пошук за текстом або #хештегом"
          aria-label="Пошук нотаток"
        />
      </div>

      <div className="wb-note-controls">
        <button
          type="button"
          className="wb-btn wb-btn-secondary"
          aria-label={`Сортування: ${sortOption.label}`}
          onClick={() => setPicker("sort")}
        >
          <Icon name="list" size={16} />
          {sortOption.short}
        </button>
        <button
          type="button"
          className="wb-btn wb-btn-secondary"
          aria-label={`Групування: ${groupOption.label}`}
          onClick={() => setPicker("group")}
        >
          <Icon name="blocks" size={16} />
          {groupOption.short}
        </button>
        <button
          type="button"
          className="wb-btn wb-btn-secondary"
          aria-label={`Фільтр за хештегами: ${tagLabel}`}
          onClick={() => setPicker("tags")}
        >
          <Icon name="hash" size={16} />
          {tagLabel}
        </button>
      </div>

      {/* Рядок підказки з'являється лише тоді, коли є що сказати: скільки
          лишилось після пошуку й чим скинути. */}
      {(filtered || shown !== total) && (
        <div className="wb-note-summary">
          <span className="wb-text-muted">
            {shown} із {total}
          </span>
          {filtered && (
            <button
              type="button"
              className="wb-btn wb-btn-secondary wb-btn-sm"
              onClick={() => onChange({ ...DEFAULT_NOTES_VIEW })}
            >
              <Icon name="close" size={14} />
              Скинути
            </button>
          )}
        </div>
      )}

      {picker && (
        <MenuModal
          title={PICKER_TITLES[picker]}
          items={pickerItems()}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
