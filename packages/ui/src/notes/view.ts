/**
 * Правила списку нотаток — чисті функції, без React і без стану.
 *
 * Пошук, фільтр, сортування й групування — це те, що вирішує, **чи знайде
 * людина свою нотатку**. Тому вони живуть однією функцією на весь вигляд
 * (`buildGroups`), а не розсипом по розмітці: саме тут найлегше зламати щось
 * мовчки — «нічого не знайдено» виглядає однаково і коли фільтр правильний, і
 * коли він зламався.
 *
 * **Що тут нотаткове, а що спільне.** Тут лишається те, що знає про нотатку:
 * за чим її шукати (текст + хештеги), як її сортувати, за чим групувати й що
 * написати в чипі. А правила, однакові для будь-якого списку з хештегами, —
 * нормалізація запиту, «усі / без хештегів / вибрані теги», акцент на
 * знайденому тезі, «за днями» й складання чипів — живуть у спільному
 * `@wwwuabot/ui/collection`: контакти шукають за тими самими правилами, і друга
 * копія розійшлася б із першою тихо.
 *
 * @module @wwwuabot/ui/notes
 */

import type { NoteRow } from "@wwwuabot/shared/notes";
import {
  DAY_BUCKETS,
  UNTAGGED_LABEL,
  buildTagChips,
  buildViewChips,
  dayBucket,
  hitTags,
  matchesTagFilter,
  queryWords,
  selectedTags,
  uniqueTags,
} from "../collection";
import { noteTimestamp } from "./format";
import { DEFAULT_NOTES_VIEW } from "./types";
import type { NotesChip, NotesGroup, NotesGroupBy, NotesSort, NotesView } from "./types";

/**
 * Варіанти сортування — дані для пікера, а не розмітка.
 *
 * `label` — те, що людина бачить у списку вибору; `short` — те, що стоїть на
 * чипі, бо він мусить уміститися в рядок на телефоні.
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

/** Усі хештеги списку — за абеткою. Для фільтра. */
export function collectTags(notes: readonly NoteRow[]): string[] {
  return uniqueTags(notes.map((note) => note.tags));
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

/**
 * Хештеги, які **знайшли** поточний пошук або фільтр.
 *
 * Це різниця між «тег є в нотатці» і «тег і є тим, що шукали»: у стовпчику
 * однакових приглушених підписів око не бачить, за що зачепився пошук, і
 * нотатка, яку знайшли саме за тегом, виглядає так само, як будь-яка інша.
 * Тому картка й виділяє знайдене акцентом — і коли тег знайшов пошук (слово
 * запиту в ньому), і коли він вибраний у фільтрі.
 *
 * Нічого не шукали — нічого й не знайдено: **порожній список**. Акцентувати
 * всі теги, коли пошуку немає, означало б акцентувати ніщо: акцент каже про
 * дію, а не про наявність (правило 19).
 */
export function foundTags(tags: readonly string[], view: NotesView): string[] {
  return hitTags(tags, queryWords(view.query), selectedTags(view.tags));
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
    (note) => matchesQuery(note, words) && matchesTagFilter(note.tags, view.tags),
  );
  return sortNotes(kept, view.sort);
}

/**
 * Чипи смуги керування — вибране, яке видно й прибирається дотиком.
 *
 * Клітинка-іконка про вибір не каже нічого (у ній сам знак), тож стан показує
 * чип. Складає їх спільне правило: тут лишаються **нотаткові** варіанти —
 * «Нові», «За днями» — і слово «нотатки» в підписі.
 */
export function viewChips(view: NotesView): NotesChip[] {
  return buildViewChips(view, {
    defaults: DEFAULT_NOTES_VIEW,
    sortOptions: SORT_OPTIONS,
    groupOptions: GROUP_OPTIONS,
    itemWord: "нотатки",
    // Звужує список тут саме фільтр за хештегами — його чипи й подаємо.
    filter: (current) => buildTagChips(current.tags, "нотатки"),
  });
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
  const groups: NotesGroup[] = collectTags(visible).map((tag) => ({
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
