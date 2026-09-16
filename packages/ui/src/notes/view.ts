/**
 * Правила списку нотаток — чисті функції, без React і без стану.
 *
 * Пошук, фільтр, сортування й групування — це те, що вирішує, **чи знайде
 * людина свою нотатку**. Тому вони живуть однією функцією на весь вигляд
 * (`buildGroups`), а не розсипом по розмітці: саме тут найлегше зламати щось
 * мовчки — «нічого не знайдено» виглядає однаково і коли фільтр правильний, і
 * коли він зламався.
 *
 * Нормалізація пошуку — та сама, що в `@wwwuabot/shared/notes`: хештеги в базі
 * лежать у нижньому регістрі й без `#`, тож і запит мусить читатись так само,
 * інакше «#Київ» нічого не знайшов би.
 *
 * @module @wwwuabot/ui/notes
 */

import type { NoteRow } from "@wwwuabot/shared/notes";
import { noteTimestamp } from "./format";
import { DEFAULT_NOTES_VIEW } from "./types";
import type {
  NotesChip,
  NotesGroup,
  NotesGroupBy,
  NotesSort,
  NotesTagFilter,
  NotesView,
} from "./types";

/**
 * Варіанти сортування — дані для пікера, а не розмітка.
 *
 * `label` — те, що людина бачить у списку вибору; `short` — те, що стоїть на
 * самій кнопці, бо вона мусить уміститися в рядок на телефоні.
 */
export const SORT_OPTIONS: readonly { value: NotesSort; label: string; short: string }[] = [
  { value: "updated-desc", label: "Спочатку змінені", short: "Змінені" },
  { value: "updated-asc", label: "Спочатку давно змінені", short: "Давні" },
  { value: "created-desc", label: "Спочатку нові", short: "Нові" },
  { value: "created-asc", label: "Спочатку найстаріші", short: "Найстаріші" },
  { value: "alpha", label: "За текстом, за абеткою", short: "За абеткою" },
];

/** Варіанти групування — теж дані. */
export const GROUP_OPTIONS: readonly { value: NotesGroupBy; label: string; short: string }[] = [
  { value: "day", label: "За днями", short: "За днями" },
  { value: "tag", label: "За хештегами", short: "За тегами" },
  { value: "none", label: "Без груп", short: "Без груп" },
];

/** Підпис групи «без хештегів» — той самий і в списку, і у фільтрі. */
export const UNTAGGED_LABEL = "Без хештегів";

/** Усі хештеги, які є в списку, — за абеткою. Для фільтра. */
export function collectTags(notes: readonly NoteRow[]): string[] {
  const tags = new Set<string>();
  for (const note of notes) for (const tag of note.tags) tags.add(tag);
  return [...tags].sort((a, b) => a.localeCompare(b, "uk"));
}

/**
 * Чи проходить нотатка пошук.
 *
 * Слова запиту з'єднуються через «і», а не «або»: «київ свято» має знайти
 * нотатку, де є обидва, а не все, де є хоч одне — інакше пошук віддає більше,
 * ніж просили, і це виглядає як «шукає не те».
 */
function matchesQuery(note: NoteRow, words: readonly string[]): boolean {
  if (words.length === 0) return true;
  const haystack = `${note.text} ${note.tags.join(" ")}`.toLocaleLowerCase("uk-UA");
  return words.every((word) => haystack.includes(word));
}

function matchesTagFilter(note: NoteRow, filter: NotesTagFilter): boolean {
  if (filter.kind === "all") return true;
  if (filter.kind === "untagged") return note.tags.length === 0;
  return note.tags.includes(filter.tag);
}

/** Слова запиту: нижній регістр, `#` не має значення (у базі тегів він і так немає). */
export function queryWords(query: string): string[] {
  return query.toLocaleLowerCase("uk-UA").replace(/#/g, " ").split(/\s+/).filter(Boolean);
}

/** Сортує нотатки за вибраним порядком. Повертає **новий** масив. */
export function sortNotes(notes: readonly NoteRow[], sort: NotesSort): NoteRow[] {
  const sorted = [...notes];
  switch (sort) {
    case "updated-asc":
      return sorted.sort((a, b) => noteTimestamp(a.updated_at) - noteTimestamp(b.updated_at));
    case "created-desc":
      return sorted.sort((a, b) => noteTimestamp(b.created_at) - noteTimestamp(a.created_at));
    case "created-asc":
      return sorted.sort((a, b) => noteTimestamp(a.created_at) - noteTimestamp(b.created_at));
    case "alpha":
      return sorted.sort((a, b) => a.text.localeCompare(b.text, "uk"));
    case "updated-desc":
    default:
      return sorted.sort((a, b) => noteTimestamp(b.updated_at) - noteTimestamp(a.updated_at));
  }
}

/** Нотатки, які проходять пошук і фільтр, у вибраному порядку. */
export function filterNotes(notes: readonly NoteRow[], view: NotesView): NoteRow[] {
  const words = queryWords(view.query);
  const kept = notes.filter(
    (note) => matchesQuery(note, words) && matchesTagFilter(note, view.tags),
  );
  return sortNotes(kept, view.sort);
}

/** Підпис варіанта — те саме, що стоїть у списку вибору. */
function optionShort<T extends string>(
  options: readonly { value: T; short: string }[],
  value: T,
): string {
  return options.find((option) => option.value === value)?.short ?? value;
}

/**
 * Чипи смуги керування — вибране, яке видно й прибирається дотиком.
 *
 * Клітинка-іконка про вибір не каже нічого (у ній сам знак), тож стан показує
 * чип. Типове значення чипа не має: інакше «Змінені» й «За днями» висіли б
 * постійно, займали місце й повідомляли те, що й так видно зі списку.
 *
 * Порядок стали́й і відповідає тому, як список читають: спершу те, чим його
 * звузили (пошук, хештеги), далі те, як його склали (порядок, групи).
 */
export function viewChips(view: NotesView): NotesChip[] {
  const chips: NotesChip[] = [];
  const query = view.query.trim();

  if (query) {
    chips.push({
      key: "query",
      label: `«${query}»`,
      action: `Прибрати пошук «${query}»`,
      reset: { query: "" },
    });
  }

  if (view.tags.kind === "tag") {
    chips.push({
      key: "tags",
      label: `#${view.tags.tag}`,
      action: `Прибрати фільтр за хештегом #${view.tags.tag}`,
      reset: { tags: DEFAULT_NOTES_VIEW.tags },
    });
  } else if (view.tags.kind === "untagged") {
    chips.push({
      key: "tags",
      label: UNTAGGED_LABEL,
      action: "Показати й нотатки з хештегами",
      reset: { tags: DEFAULT_NOTES_VIEW.tags },
    });
  }

  if (view.sort !== DEFAULT_NOTES_VIEW.sort) {
    chips.push({
      key: "sort",
      label: optionShort(SORT_OPTIONS, view.sort),
      action: `Повернути типовий порядок (${optionShort(SORT_OPTIONS, DEFAULT_NOTES_VIEW.sort)})`,
      reset: { sort: DEFAULT_NOTES_VIEW.sort },
    });
  }

  if (view.groupBy !== DEFAULT_NOTES_VIEW.groupBy) {
    chips.push({
      key: "group",
      label: optionShort(GROUP_OPTIONS, view.groupBy),
      action: `Повернути типові групи (${optionShort(GROUP_OPTIONS, DEFAULT_NOTES_VIEW.groupBy)})`,
      reset: { groupBy: DEFAULT_NOTES_VIEW.groupBy },
    });
  }

  return chips;
}

const DAY_MS = 86_400_000;

/** Опівніч **локального** дня — щоб межі груп не залежали від часу доби. */
function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Групи «за днями», у сталому порядку — найсвіжіші згори. */
const DAY_BUCKETS: readonly { key: string; label: string }[] = [
  { key: "today", label: "Сьогодні" },
  { key: "yesterday", label: "Вчора" },
  { key: "week", label: "Раніше цього тижня" },
  { key: "month", label: "Раніше цього місяця" },
  { key: "older", label: "Давніше" },
];

/** Яка з груп-днів підходить нотатці. Рахуємо від опівночі, а не від «N діб». */
function dayBucket(time: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return "week";
  if (days < 30) return "month";
  return "older";
}

/**
 * Складає список у групи за вибраним правилом.
 *
 * `now` — аргумент, а не `new Date()` усередині: інакше «Сьогодні» залежало б
 * від моменту виклику, і перевірити це тестом було б неможливо.
 */
export function buildGroups(
  notes: readonly NoteRow[],
  view: NotesView,
  now: number = Date.now(),
): NotesGroup[] {
  const visible = filterNotes(notes, view);

  if (view.groupBy === "none") {
    return visible.length === 0 ? [] : [{ key: "all", label: "Усі нотатки", notes: visible }];
  }

  if (view.groupBy === "day") {
    return DAY_BUCKETS.map((bucket) => ({
      key: `day:${bucket.key}`,
      label: bucket.label,
      notes: visible.filter(
        (note) => dayBucket(noteTimestamp(note.updated_at), now) === bucket.key,
      ),
    })).filter((group) => group.notes.length > 0);
  }

  // Групування за хештегами: нотатка з кількома тегами чесно стоїть у кожній
  // своїй групі — це вигляд «що лежить під цим тегом», а не друга копія даних.
  const tags = collectTags(visible);
  const groups: NotesGroup[] = tags.map((tag) => ({
    key: `tag:${tag}`,
    label: `#${tag}`,
    notes: visible.filter((note) => note.tags.includes(tag)),
  }));
  const untagged = visible.filter((note) => note.tags.length === 0);
  if (untagged.length > 0) {
    groups.push({ key: "tag:__none__", label: UNTAGGED_LABEL, notes: untagged });
  }
  return groups;
}
