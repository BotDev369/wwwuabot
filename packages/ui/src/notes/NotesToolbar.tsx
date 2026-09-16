/**
 * Смуга керування списком нотаток: пошук, три вибори (сортування, групування,
 * фільтр за хештегами) і знімні чипи вибраного.
 *
 * Вибори **не** випадають списком (правило 4): кожен відкриває ту саму
 * повноекранну поверхню, що й меню профілю (`MenuModal`), і вибраний варіант
 * позначений галочкою — бо це стан, а не перехід.
 *
 * Самі клітинки — без підпису й без заливки: та сама клітинка, що у вкладок
 * композера (одне правило на всіх), тому ряд читається як звична панель дій, а
 * не як три «овали». «Що зараз вибрано» показує **не** клітинка, а чип поруч:
 * його видно очима, і дотик прибирає вибір (правила вибору — `viewChips` у
 * `view.ts`, чисті й перевірені тестом).
 *
 * @module @wwwuabot/ui/notes
 */

import { useState, type ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import { MenuModal, type MenuItem } from "../menu";
import type { NotesGroupBy, NotesSort, NotesTagFilter, NotesView } from "./types";
import { GROUP_OPTIONS, SORT_OPTIONS, UNTAGGED_LABEL, viewChips } from "./view";

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

/**
 * Три вибори — дані, а не розмітка: четвертий буде рядком у цьому списку.
 *
 * Знаки різні навмисно, бо різні й дії: стрілки в різні боки — порядок,
 * стос шарів — групування, решітка — хештег. Один і той самий знак на всі три
 * (як було з `list`/`blocks`/`hash`) не каже нічого.
 */
const PICKERS: readonly { key: Picker; label: string; icon: IconName }[] = [
  { key: "sort", label: "Сортування", icon: "sort" },
  { key: "group", label: "Групування", icon: "layers" },
  { key: "tags", label: "Хештеги", icon: "hash" },
];

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

  /** Що зараз вибрано — словами: у клітинці лише знак, тож ім'я й стан читає
      `aria-label`, а не око. Вибране видно поруч, чипом. */
  const chosen: Record<Picker, string> = {
    sort: sortOption.label,
    group: groupOption.label,
    tags: tagLabel,
  };

  /** Пункти пікера: вибраний позначений галочкою (`selected`). */
  function pickerItems(): MenuItem[] {
    if (picker === "sort") {
      return SORT_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        icon: "sort" as const,
        selected: view.sort === option.value,
        onSelect: () => changeSort(option.value),
      }));
    }
    if (picker === "group") {
      return GROUP_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        icon: "layers" as const,
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

  const chips = viewChips(view);

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

      {/* Один ряд: три клітинки вибору й чипи вибраного — поруч, як знімні теги. */}
      <div className="wb-note-controls">
        {PICKERS.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            className="wb-note-tool"
            aria-label={`${label}: ${chosen[key]}`}
            title={`${label}: ${chosen[key]}`}
            onClick={() => setPicker(key)}
          >
            <Icon name={icon} size={18} />
          </button>
        ))}

        {chips.length > 0 && (
          <div className="wb-note-chips">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="wb-chip wb-note-chip"
                aria-label={chip.action}
                title={chip.action}
                onClick={() => onChange(chip.reset)}
              >
                <span className="wb-note-chip-label">{chip.label}</span>
                <Icon name="close" size={12} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Рядок підказки з'являється лише тоді, коли є що сказати: скільки
          лишилось після пошуку й фільтрів. */}
      {shown !== total && (
        <div className="wb-note-summary">
          <span className="wb-text-muted">
            Знайдено {shown} із {total}
          </span>
        </div>
      )}

      {picker && (
        <MenuModal
          title={PICKERS.find((item) => item.key === picker)?.label ?? ""}
          items={pickerItems()}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
