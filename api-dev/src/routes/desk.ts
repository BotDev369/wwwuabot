/**
 * Шляхи «Стола»: адреси виписані повністю, щоб інвентар `docs/API.md` їх бачив.
 * Бік (хто пише) вирішує **сесія**: `desk_session` — Buffy, `admin_session` —
 * Сергій, а не тіло запиту, інакше авторство підмінялося б рядком JSON.
 *
 * @module api-dev/src/routes/desk
 */

import { sessionSide } from "@wwwuabot/shared/security/session";
import type { DeskSide } from "@wwwuabot/shared/desk/model";
import type { Env } from "../shared/types";
import { handleDesk } from "../controllers/desk.controller";

/** Обгортка: сесія → бік → контролер. Без сесії бік не вгадується. */
async function dispatch(request: Request, env: Env, sub: string): Promise<Response> {
  const side = await sessionSide(request, env.ADMIN_SECRET);
  const author: DeskSide = side === "buffy" ? "buffy" : "serhii";
  return handleDesk(request, env, sub, author);
}

/** Повертає відповідь, якщо шлях належить столу, інакше `null`. */
export function matchDeskRoute(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> | null {
  if (pathname === "/api/admin/desk/threads") return dispatch(request, env, "threads");
  if (pathname === "/api/admin/desk/thread") return dispatch(request, env, "thread");
  if (pathname === "/api/admin/desk/entry") return dispatch(request, env, "entry");
  if (pathname === "/api/admin/desk/read") return dispatch(request, env, "read");
  if (pathname === "/api/admin/desk/file") return dispatch(request, env, "file");
  return null;
}
