import type { Env } from "../../shared/types";

export function checkAdminAuth(request: Request, env: Env): boolean {
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret || secret !== env.ADMIN_SECRET) {
    return false;
  }
  return true;
}

export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Unauthorized", message: "Admin secret required" }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
}
