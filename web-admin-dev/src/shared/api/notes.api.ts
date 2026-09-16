/**
 * Нотатки про проєкт з адмінки.
 *
 * Другий (і останній) шлях для тієї самої нотатки: власник тут — акаунт
 * cookie-сесії, а не Telegram-людина, тому й маршрут під `/api/admin/`, де
 * стоїть адмін-гейт. Форма запиту спільна з платформою
 * (`@wwwuabot/shared/notes`).
 *
 * @module web-admin-dev/src/shared/api
 */

import { createNotesApi } from "@wwwuabot/shared/notes";
import { apiFetch } from "./client";

export const notesApi = createNotesApi(apiFetch, "/api/admin/notes");
