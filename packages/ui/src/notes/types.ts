/**
 * Стан вигляду списку нотаток: пошук, фільтр, сортування, групування.
 *
 * Це **не** склад екрана, а опис того, як ті самі дані показати. Тому тут
 * немає ні React, ні API: `view.ts` перетворює `NoteRow[]` + `NotesView` у
 * групи для рендеру, і саме тому все це можна перевірити тестами без DOM.
 *
 * @module @wwwuabot/ui/notes
 */

import type { NoteRow } from "@wwwuabot/shared/notes";

/** Порядок показу нотаток. */
export type NotesSort = "updated-desc" | "updated-asc" | "created-desc" | "created-asc" | "alpha";

/** За чим збирати нотатки в групи. */
export type NotesGroupBy = "none" | "day" | "tag";

/**
 * Фільтр за хештегами.
 *
 * Це не `string | null`: «усі», «без хештегів» і «конкретний тег» — три різні
 * речі, і рядок-сентевел для «без хештегів» рано чи пізно зіткнувся б із
 * справжнім тегом (нормалізація не забороняє майже жодного символу).
 */
export type NotesTagFilter = { kind: "all" } | { kind: "untagged" } | { kind: "tag"; tag: string };

/** Те, що людина вибрала у смузі керування. */
export interface NotesView {
  /** Пошук за текстом і хештегами (усі слова мусять знайтись). */
  query: string;
  tags: NotesTagFilter;
  sort: NotesSort;
  groupBy: NotesGroupBy;
}

export const DEFAULT_NOTES_VIEW: NotesView = {
  query: "",
  tags: { kind: "all" },
  sort: "updated-desc",
  groupBy: "day",
};

/** Група в списку — з неї рендериться заголовок і картки. */
export interface NotesGroup {
  /** Стабільний ключ React-списку (`day:today`, `tag:київ`, `all`). */
  key: string;
  /** Підпис групи. */
  label: string;
  notes: NoteRow[];
}
