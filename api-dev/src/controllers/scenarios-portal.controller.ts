/**
 * Контролер CRUD для таблиці `scenarios` (портальні сценарії).
 *
 * Логіка живе в `scenarios.controller.factory.ts`, схема — у реєстрі
 * (`@wwwuabot/shared/database/tables`). Це та сама таблиця, з якої читає
 * bot-dev, тому правки тут видно і в боті, і на порталі — навмисно.
 *
 * Ендпоїнти:
 *   POST /api/portal/scenarios/read       — прочитати за codeword
 *   POST /api/portal/scenarios/write      — UPSERT (create/update)
 *   GET  /api/portal/scenarios/list       — список (ETag + 304)
 *   POST /api/portal/scenarios/read-all   — прочитати всі поля за codeword
 *   POST /api/portal/scenarios/update     — оновити передані поля
 *   POST /api/portal/scenarios/delete     — видалити за codeword
 *
 * @module api-dev/src/controllers/scenarios-portal.controller
 */

import { createScenariosController, type ScenarioTableName } from "./scenarios.controller.factory";

/** Назва таблиці для портальних сценаріїв. */
const TABLE: ScenarioTableName = "scenarios";

export const { handleRead, handleWrite, handleList, handleReadAll, handleUpdate, handleDelete } =
  createScenariosController({ table: TABLE });
