/**
 * Контролер CRUD для таблиці `scenarios-admin`.
 *
 * Логіка живе в `scenarios.controller.factory.ts` — тут лишається тільки
 * конфігурація: назва таблиці. Схему дає реєстр
 * (`@wwwuabot/shared/database/tables`), тож окремого «створення таблиці»
 * більше немає і дві таблиці сценаріїв не можуть розійтися колонками.
 *
 * Ендпоїнти:
 *   POST /api/admin/scenarios/read       — прочитати за codeword
 *   POST /api/admin/scenarios/write      — UPSERT (create/update)
 *   GET  /api/admin/scenarios/list       — список (ETag + 304)
 *   POST /api/admin/scenarios/read-all   — прочитати всі поля за codeword
 *   POST /api/admin/scenarios/update     — оновити передані поля
 *   POST /api/admin/scenarios/delete     — видалити за codeword
 *
 * @module api-dev/src/controllers/scenarios-admin.controller
 */

import { createScenariosController, type ScenarioTableName } from "./scenarios.controller.factory";

/** Назва таблиці для admin-сценаріїв. */
const TABLE: ScenarioTableName = "scenarios-admin";

export const { handleRead, handleWrite, handleList, handleReadAll, handleUpdate, handleDelete } =
  createScenariosController({ table: TABLE });
