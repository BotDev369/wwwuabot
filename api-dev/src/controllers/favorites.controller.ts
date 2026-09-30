import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { favoriteTarget } from "@wwwuabot/shared/favorites";
import type { Env } from "../shared/types";
import { resolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";
import { listFavorites, removeFavorite, saveFavorite } from "../services/favorites.service";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleFavorites(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  if (!["GET", "POST", "DELETE"].includes(request.method)) {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }
  try {
    await ensureTables(env.DB, ["favorites"]);
    if (request.method === "GET") {
      const query = new URL(request.url).searchParams;
      if (query.has("kind") || query.has("targetId")) {
        const target = favoriteTarget({
          kind: query.get("kind"),
          targetId: Number(query.get("targetId")),
        });
        if (!target) return json({ ok: false, error: "Invalid target" }, 400);
        const row = await env.DB.prepare(
          "SELECT id FROM favorites WHERE owner_id = ? AND kind = ? AND target_id = ?",
        )
          .bind(String(identity.userId), target.kind, target.targetId)
          .first();
        return json({ ok: true, liked: row !== null });
      }
      return json({ ok: true, items: await listFavorites(env, identity.userId) });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }
    const target = favoriteTarget(body);
    if (!target) return json({ ok: false, error: "Invalid target" }, 400);
    if (request.method === "DELETE") {
      await removeFavorite(env, identity.userId, target);
      return json({ ok: true, liked: false });
    }
    if (!(await saveFavorite(env, identity.userId, target))) {
      return json({ ok: false, error: "Контент недоступний" }, 404);
    }
    return json({ ok: true, liked: true });
  } catch (error: unknown) {
    apiLog.error("Favorites error", error);
    return json({ ok: false, error: "Не вдалося завантажити обране" }, 500);
  }
}
