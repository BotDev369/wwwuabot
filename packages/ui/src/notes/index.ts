/**
 * @wwwuabot/ui/notes — список нотаток: пошук, фільтр, сортування, групування.
 *
 * Підключення в оболонці:
 *
 *   import { NotesList, NotesToolbar, buildGroups } from "@wwwuabot/ui/notes";
 *
 * Куди саме писати нотатки — знає **оболонка** (`createNotesApi` зі своїм
 * транспортом): у платформі нотатка належить людині, у панелі — проєкту. Тут
 * лишається те, що однакове: як їх знайти, показати й відкрити. Читає нотатку
 * **сама картка** (акордеон), а редагує й прибирає оболонка — через `onEdit`
 * та `onDelete`, бо саме вона знає і композер, і правила підтвердження.
 *
 * @module @wwwuabot/ui/notes
 */

export { NotesList } from "./NotesList";
export { NotesToolbar } from "./NotesToolbar";
export { formatNoteStamp, noteTimestamp } from "./format";
export {
  buildGroups,
  collectTags,
  filterNotes,
  foundTags,
  queryWords,
  selectedTags,
  sortNotes,
  tagFilterLabel,
  toggleTagFilter,
  viewChips,
  GROUP_OPTIONS,
  SORT_OPTIONS,
  UNTAGGED_LABEL,
} from "./view";
export { DEFAULT_NOTES_VIEW } from "./types";
export type {
  NotesChip,
  NotesGroup,
  NotesGroupBy,
  NotesSort,
  NotesTagFilter,
  NotesView,
} from "./types";
