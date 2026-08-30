import type { Env } from "../../shared/types/env";

/**
 * Перевіряє ADMIN_SECRET з заголовка запиту.
 *
 * @param request - HTTP запит
 * @param env - Середовище воркера
 * @returns `true` якщо аутентифікація пройдена, `false` якщо ні
 *
 * Використання:
 * ```ts
 * if (!checkAdminAuth(request, env)) {
 *   return new Response("Unauthorized", { status: 401 });
 * }
 * ```
 */
export function checkAdminAuth(request: Request, env: Env): boolean {
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret || secret !== env.ADMIN_SECRET) {
    return false;
  }
  return true;
}

/**
 * Повертає JSON відповідь "Unauthorized" з HTTP 401.
 */
export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Unauthorized", message: "Admin secret required" }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    },
  );
}
