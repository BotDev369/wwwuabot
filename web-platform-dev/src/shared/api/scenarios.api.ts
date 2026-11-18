/**
 * Сценарії людини в платформі — ті, які вона веде.
 *
 * Форму запиту тримає спільний клієнт (`@wwwuabot/shared/pages`): тут лишаються
 * тільки **шляхи**, і саме тому вони тут, а не в компоненті. Власника бере
 * підписаний `initData`, тож клієнт не передає жодного `user_id`.
 *
 * @module web-platform-dev/src/shared/api
 */

import { createPagesApi } from "@wwwuabot/shared/pages";
import { apiFetch } from "./client";

export const scenariosApi = createPagesApi(apiFetch, {
  own: "/api/user/pages",
});
