/**
 * Нотатки людини в платформі.
 *
 * Форму запиту тримає спільний клієнт (`@wwwuabot/shared/notes`): тут
 * лишається тільки шлях. Ідентичність додає `apiFetch` цієї оболонки —
 * підписаний `initData`; власника нотатки з клієнта не передають ніколи.
 *
 * @module web-platform-dev/src/shared/api
 */

import { createNotesApi } from "@wwwuabot/shared/notes";
import { apiFetch } from "./client";

export const notesApi = createNotesApi(apiFetch, "/api/notes");
