/**
 * Стан вигляду списку нотаток: пошук, фільтр, сортування, групування й вигляд
 * (рядки чи картки-превью).
 *
 * Це **не** склад екрана, а опис того, як ті самі дані показати. Тому тут
 * немає ні React, ні API: `view.ts` перетворює `NoteRow[]` + `NotesView` у
 * групи для рендеру, і саме тому все це можна перевірити тестами без DOM.
 *
 * Два поля тут — не нотаткові, а **спільні** (`@wwwuabot/ui/collection`):
 * фільтр за хештегами (`NotesTagFilter` — це `CollectionTagFilter`) і вигляд
 * розкладки. Хештеги лежать однаково в нотаток і контактів, і шукають їх
 * однаково, тож і тип у них один — інакше два набори тихо розійшлися б
 * (`#Київ` знайшовся б в одному списку й не знайшовся в другому).
 *
 * @module @wwwuabot/ui/notes
 */

import type { NoteRow } from "@wwwuabot/shared/notes";
import type {
  CollectionChip,
  CollectionColumns,
  CollectionLayout,
  CollectionTagFilter,
} from "../collection";

/** Порядок показу нотаток. */
export type NotesSort = "updated-desc" | "updated-asc" | "created-desc" | "created-asc" | "alpha";

/** За чим збирати нотатки в групи. */
export type NotesGroupBy = "none" | "day" | "tag";

/** Фільтр за хештегами — спільне правило: усі / без хештегів / вибрані теги. */
export type NotesTagFilter = CollectionTagFilter;

/** Те, що людина вибрала у смузі керування. */
export interface NotesView {
  /** Пошук за текстом і хештегами (усі слова мусять знайтись). */
  query: string;
  tags: NotesTagFilter;
  sort: NotesSort;
  groupBy: NotesGroupBy;
  /**
   * Як розставлено список — рядками чи плитками.
   *
   * Стан того самого екрана, а не його власність: розкладку тримає спільний
   * кирпичик `@wwwuabot/ui/collection` (`collectionViewClass`), і той самий
   * вибір буде в товарів, новин і постів. Типове — рядки: список читають
   * заради тексту, і рядок віддає йому всю ширину.
   */
  layout: CollectionLayout;
  /** Скільком колонками стоять плитки. У рядків значення немає. */
  columns: CollectionColumns;
}

export const DEFAULT_NOTES_VIEW: NotesView = {
  query: "",
  tags: { kind: "all" },
  sort: "updated-desc",
  groupBy: "day",
  layout: "rows",
  columns: 2,
};

/**
 * Чип смуги керування — те, що людина вибрала, і як це зняти.
 *
 * Складає їх **спільний** `buildViewChips` із `@wwwuabot/ui/collection`: чип
 * описує рівно один вибір, і правило «типове чипа не має» однакове для будь-якої
 * колекції.
 */
export type NotesChip = CollectionChip<NotesView>;

/** Група в списку — з неї рендериться заголовок і картки. */
export interface NotesGroup {
  /** Стабільний ключ React-списку (`day:today`, `tag:київ`, `all`). */
  key: string;
  /** Підпис групи. */
  label: string;
  notes: NoteRow[];
}
