/**
 * «Чи є в мене доступ» — один запит, який клієнт робить перед платформою.
 *
 * **Чому це ендпоінт, а не реакція на 403.** Гейт допуску (`shared/access.ts`)
 * відповідає `403` на кожен запит, але екран «за запрошенням» має з'явитися
 * **до** того, як додаток почне щось робити: інакше людина побачить порожні
 * екрани з помилками замість пояснення. Тому запит про допуск стоїть перед
 * гейтом (`PLATFORM_EXEMPT_PATHS` у `router.ts`) і єдиний серед платформенних,
 * що не закритий ним самим.
 *
 * **Відповідь завжди `200`.** Питання «чи є в мене доступ» не є помилкою:
 * відмова — це відповідь, а не збій (§7). Тому клієнт читає `allowed`, а не
 * код відповіді, інакше довелося б розрізняти 403 від 401 у кожному місці.
 *
 * @module api-dev/src/controllers/access.controller
 */

import type { Env } from "../shared/types";
import { tryResolveUserId } from "../shared/identity";
import { hasAccess } from "@wwwuabot/shared/security/access";
import { apiLog } from "../shared/logger";

/** `GET /api/user/access` — `{ allowed: boolean }`. */
export async function handleAccess(request: Request, env: Env): Promise<Response> {
  const userId = await tryResolveUserId(request, env);

  let allowed = false;
  if (userId !== null) {
    try {
      const row = await env.DB.prepare("SELECT inviter_id FROM users WHERE user_id = ?")
        .bind(userId)
        .first<{ inviter_id: number | null }>();
      allowed = hasAccess(row);
    } catch (error: unknown) {
      // Не вдалося перевірити — значить не впускаємо: закритий продукт лишається
      // закритим (те саме рішення, що в `shared/access.ts`).
      apiLog.error("access probe failed", error);
    }
  }

  return new Response(JSON.stringify({ allowed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
