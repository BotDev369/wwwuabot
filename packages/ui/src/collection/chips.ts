/**
 * Чипи вибраного — спільне правило для будь-якого списку з виглядом.
 *
 * Чип описує **рівно один** вибір, тому його видно очима (на відміну від
 * клітинки-іконки) і дотик повертає цей вибір до типового, не чіпаючи решти.
 * Типові значення чипа не мають: постійні «Змінені» й «За днями» займали б
 * місце й говорили б про те, що й так видно зі списку.
 *
 * Порядок стали́й і відповідає тому, як список читають: спершу те, чим його
 * звузили (пошук, фільтр), далі те, як його склали (порядок, групи, вигляд).
 *
 * **Що саме звужує список — знає екран.** Хештеги, «непрочитані», «без
 * повідомлень» — це різні фільтри, і спільне правило не мусить знати жодного з
 * них: воно бере готові чипи фільтра від екрана (`filter`). Хештеги лишаються
 * тут як **готовий набір** для тих, у кого вони є, — щоб нотатки й контакти не
 * описували одне правило двічі.
 *
 * @module @wwwuabot/ui/collection
 */

import {
  DEFAULT_TAG_FILTER,
  UNTAGGED_LABEL,
  toggleTagFilter,
  type CollectionTagFilter,
} from "./tags";
import { collectionViewShort, type CollectionColumns, type CollectionLayout } from "./types";

/**
 * Мінімум, який має мати вигляд списку, щоб із нього склались чипи.
 *
 * `sort` і `groupBy` тут — рядки, а не об'єднання: правило спільне, а які саме
 * порядки бувають — знає екран (у нотаток «за абеткою тексту», у контактів «за
 * іменем»). Тому варіанти приходять конфігом, а не живуть тут.
 */
export interface ChipView {
  query: string;
  sort: string;
  groupBy: string;
  layout: CollectionLayout;
  columns: CollectionColumns;
}

/** Чип готовий до показу: `reset` — те, що повертає дотик. */
export interface CollectionChip<V> {
  key: string;
  label: string;
  action: string;
  reset: Partial<V>;
}

export interface ChipConfig<V extends ChipView> {
  /** Типовий вигляд — те, до чого чип повертає. */
  defaults: V;
  sortOptions: readonly { value: V["sort"]; short: string }[];
  groupOptions: readonly { value: V["groupBy"]; short: string }[];
  /** Як назвати елемент у підписі чипа: «нотатки», «контакти». */
  itemWord: string;
  /** Чим список звузили, крім пошуку. Порожній результат — жодного чипа. */
  filter?: (view: V) => CollectionChip<V>[];
}

/**
 * Патчі збираються як `Partial<V>`: правило одне, а вигляд — конкретний, тож TS
 * не може довести, що `{ sort: … }` підходить саме цьому V. Це не послаблення
 * перевірки: ключі патча — ті самі поля `ChipView`, які є в кожного вигляду за
 * побудовою.
 */
function patch<V>(fields: Record<string, unknown>): Partial<V> {
  return fields as Partial<V>;
}

/**
 * Чипи хештегів — **готовий набір** для списків, у яких вони є.
 *
 * Вибраних тегів може бути кілька, тож чип має **кожен окремо**: інакше
 * прибрати один тег без втрати решти було б нічим.
 */
export function buildTagChips<V extends ChipView>(
  tags: CollectionTagFilter,
  /** Як назвати елемент у підписі — він звучить лише для скрінрідера. */
  itemWord: string,
): CollectionChip<V>[] {
  if (tags.kind === "untagged") {
    return [
      {
        key: "tags",
        label: UNTAGGED_LABEL,
        action: `Показати й ${itemWord} з хештегами`,
        reset: patch({ tags: DEFAULT_TAG_FILTER }),
      },
    ];
  }

  if (tags.kind !== "tags") return [];

  return tags.tags.map((tag) => ({
    key: `tag:${tag}`,
    label: `#${tag}`,
    action: `Прибрати фільтр за хештегом #${tag}`,
    reset: patch({ tags: toggleTagFilter(tags, tag) }),
  }));
}

export function buildViewChips<V extends ChipView>(
  view: V,
  config: ChipConfig<V>,
): CollectionChip<V>[] {
  const { defaults } = config;
  const chips: CollectionChip<V>[] = [];
  const query = view.query.trim();

  if (query) {
    chips.push({
      key: "query",
      label: `«${query}»`,
      action: `Прибрати пошук «${query}»`,
      reset: patch({ query: "" }),
    });
  }

  chips.push(...(config.filter?.(view) ?? []));

  if (view.sort !== defaults.sort) {
    chips.push({
      key: "sort",
      label: optionShort(config.sortOptions, view.sort),
      action: `Повернути типовий порядок (${optionShort(config.sortOptions, defaults.sort)})`,
      reset: patch({ sort: defaults.sort }),
    });
  }

  if (view.groupBy !== defaults.groupBy) {
    chips.push({
      key: "group",
      label: optionShort(config.groupOptions, view.groupBy),
      action: `Повернути типові групи (${optionShort(config.groupOptions, defaults.groupBy)})`,
      reset: patch({ groupBy: defaults.groupBy }),
    });
  }

  // Вигляд — теж вибір, тож і чип тут: плитки не типовий стан, і повернутись до
  // рядків мусить бути чим, не відкриваючи пікер заново. Колонки в ряду з
  // виглядом: «Картки · 2» без них казало б половину.
  if (view.layout !== defaults.layout) {
    chips.push({
      key: "layout",
      label: collectionViewShort(view),
      action: `Повернути звичайний список (${collectionViewShort(defaults)})`,
      reset: patch({ layout: defaults.layout, columns: defaults.columns }),
    });
  }

  return chips;
}

/** Підпис варіанта — те саме, що стоїть у списку вибору. */
function optionShort<T extends string>(
  options: readonly { value: T; short: string }[],
  value: T,
): string {
  return options.find((option) => option.value === value)?.short ?? value;
}
