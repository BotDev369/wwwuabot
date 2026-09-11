/**
 * Контролер CRUD для таблиці `scenarios` (портальні сценарії).
 *
 * Логіка живе в `scenarios.controller.factory.ts`. Портал не створює таблицю —
 * її ведуть міграції bot-dev / api-dev.
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

import { createScenariosController } from "./scenarios.controller.factory";

export const {
  handleRead,
  handleWrite,
  handleList,
  handleReadAll,
  handleUpdate,
  handleDelete,
} = createScenariosController({ table: "scenarios" });
