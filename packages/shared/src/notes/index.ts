/**
 * @wwwuabot/shared/notes — нотатки: правила, типи й клієнт.
 *
 * Один домен на обидві оболонки й на сервер:
 *
 * - `tags.ts` / `text.ts` — правила, за якими введене стає даними (їх уживає і
 *   композер, і api-dev: дві копії тут розійшлись би тихо);
 * - `types.ts` — `NoteRow`, `NoteDraft` і простори `user` / `admin`;
 * - `api.ts` — форма запиту, спільна для платформи й панелі.
 *
 * Сховище — таблиця `notes` (`@wwwuabot/shared/database/tables`), господар
 * `api-dev`.
 *
 * @module @wwwuabot/shared/notes
 */

export {
  MAX_NOTE_TAGS,
  MAX_TAG_LENGTH,
  addTags,
  normalizeTag,
  parseTags,
  parseTagsJson,
  removeTag,
  sanitizeTags,
  tagsToJson,
} from "./tags";
export { MAX_NOTE_LENGTH, sanitizeNoteText } from "./text";
export { SHARED_ADMIN_OWNER } from "./types";
export type { NoteDraft, NoteListResponse, NoteRow, NoteSaveResponse, NoteScope } from "./types";
export { createNotesApi } from "./api";
export type { NotesApi, NotesTransport } from "./api";
