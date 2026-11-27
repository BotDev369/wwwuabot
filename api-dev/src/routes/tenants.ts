/**
 * Проєкти — один домен шляхів.
 *
 * Роутер лишається списком доменів, а не переліком дій кожного з них
 * (`AGENTS.md` §3): три шляхи проєктів живуть тут, поруч зі своїм резолвером.
 *
 * @module api-dev/src/routes/tenants
 */

import type { Env } from "../shared/types";
import {
  handleCurrentTenant,
  handleTenantCreate,
  handleTenantsList,
} from "../controllers/tenants.controller";

/** `null` — шлях не наш; інакше — готова відповідь. */
export function matchTenantsRoute(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> | null {
  if (pathname === "/api/user/tenant" && request.method === "GET") {
    return handleCurrentTenant(request, env);
  }
  if (pathname === "/api/admin/tenants" && request.method === "GET") {
    return handleTenantsList(env);
  }
  if (pathname === "/api/admin/tenants" && request.method === "POST") {
    return handleTenantCreate(request, env);
  }
  return null;
}
