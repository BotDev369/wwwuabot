/**
 * Адмінська пошта про звернення — шляхи `/api/admin/access-requests`.
 *
 * **Навіщо окремо.** Роутер — це список шляхів усього воркера, і кожен наступний
 * домен додає в нього рядки; роутер уже біля межі в 400 рядків, за якою файл
 * не читають цілком (AGENTS.md §3). Тут ті самі умови, що були в роутері, —
 * разом із поясненням.
 *
 * **Усі чотири дії живуть під `/api/admin/`**, тож адмін-гейт у `router.ts`
 * перевіряє їх без окремої перевірки в контролері (див. `ADMIN_PATH_PREFIXES`).
 * Правка й видалення — окремі шляхи, а не прапорці в одному: різницю між ними
 * видно з адреси, тож клієнт не мусить угадувати, що означає поле у тілі.
 *
 * @module api-dev/src/routes/access-requests
 */

import type { Env } from "../shared/types";
import {
  handleAccessRequestsList,
  handleAccessRequestCreate,
  handleAccessRequestUpdate,
  handleAccessRequestDelete,
} from "../controllers/access-requests-admin.controller";

/**
 * Обробити шлях пошти про звернення; `null` — це не він (роутер іде далі).
 */
export function matchAccessRequestAdminRoute(
  request: Request,
  env: Env,
  pathname: string,
): Response | Promise<Response> | null {
  if (request.method === "GET" && pathname === "/api/admin/access-requests") {
    return handleAccessRequestsList(request, env);
  }
  if (request.method === "POST" && pathname === "/api/admin/access-requests") {
    return handleAccessRequestCreate(request, env);
  }
  if (request.method === "POST" && pathname === "/api/admin/access-requests/update") {
    return handleAccessRequestUpdate(request, env);
  }
  if (request.method === "DELETE" && pathname === "/api/admin/access-requests") {
    return handleAccessRequestDelete(request, env);
  }
  return null;
}
