/**
 * Шляхи «Стола» — одним модулем, як трекери й переписка. Адреси виписані
 * повністю, а не зібрані з префікса: інвентар ендпоінтів читає літерали, і
 * складений шлях зник би з `docs/API.md` тихо.
 *
 * @module api-dev/src/routes/desk
 */

import type { Env } from "../shared/types";
import { handleDesk } from "../controllers/desk.controller";

/** Повертає відповідь, якщо шлях належить столу, інакше `null`. */
export function matchDeskRoute(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> | null {
  if (pathname === "/api/admin/desk/threads") return handleDesk(request, env, "threads");
  if (pathname === "/api/admin/desk/thread") return handleDesk(request, env, "thread");
  if (pathname === "/api/admin/desk/entry") return handleDesk(request, env, "entry");
  if (pathname === "/api/admin/desk/read") return handleDesk(request, env, "read");
  if (pathname === "/api/admin/desk/file") return handleDesk(request, env, "file");
  return null;
}
