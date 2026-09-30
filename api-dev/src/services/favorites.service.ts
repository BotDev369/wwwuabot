import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { toWebPath } from "@wwwuabot/shared/content";
import { pageAdminIds, pageRole } from "@wwwuabot/shared/pages";
import type { FavoriteItem, FavoriteTarget } from "@wwwuabot/shared/favorites";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Env } from "../shared/types";
import { PublicProfileService } from "./public-profile.service";

/** Недоступне обране не розкриває навіть стару назву; видалити лайк можна завжди. */
export async function resolveFavorite(
  env: Env,
  userId: number,
  target: FavoriteTarget,
): Promise<FavoriteItem | null> {
  if (target.kind === "user") {
    const profile = await new PublicProfileService(env).readPublic(target.targetId);
    if (!profile) return null;
    return {
      ...target,
      title: profile.platformUsername ? `#${profile.platformUsername}` : "Ім'я приховано",
      href: `/space/u/${target.targetId}`,
    };
  }

  await ensureTables(env.DB, ["scenarios"]);
  const row = await env.DB.prepare(
    `SELECT id, slug, title, owner_id, admin_ids, is_public FROM scenarios
     WHERE id = ? AND is_active = 1
       AND (owner_id IS NULL OR COALESCE(is_public, 0) = 1 OR owner_id = ? OR admin_ids LIKE ?)`,
  )
    .bind(target.targetId, String(userId), `%${userId}%`)
    .first<{
      id: number;
      slug: string;
      title: string | null;
      owner_id: string | null;
      admin_ids: string | null;
      is_public: number | null;
    }>();
  if (!row) return null;
  const managed = pageRole(Number(row.owner_id), pageAdminIds(row.admin_ids), userId) !== null;
  // LIKE лише звужує кандидатів, точне право перевіряє спільне правило.
  if (row.owner_id !== null && Number(row.is_public) !== 1 && !managed) return null;
  return {
    ...target,
    title: row.title || "Сторінка",
    href: managed ? `/pages/${row.id}` : toWebPath(row.slug),
  };
}

export async function listFavorites(env: Env, userId: number): Promise<FavoriteItem[]> {
  const rows = await env.DB.prepare(
    "SELECT kind, target_id FROM favorites WHERE owner_id = ? ORDER BY id DESC LIMIT 200",
  )
    .bind(String(userId))
    .all<{ kind: FavoriteTarget["kind"]; target_id: number }>();
  return Promise.all(
    (rows.results ?? []).map(async (row) => {
      const target = { kind: row.kind, targetId: row.target_id };
      return (
        (await resolveFavorite(env, userId, target)) ?? {
          ...target,
          title: "Контент недоступний",
          href: null,
        }
      );
    }),
  );
}

export async function saveFavorite(
  env: Env,
  userId: number,
  target: FavoriteTarget,
): Promise<boolean> {
  if (!(await resolveFavorite(env, userId, target))) return false;
  await env.DB.prepare(
    "INSERT OR IGNORE INTO favorites (owner_id, kind, target_id, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(String(userId), target.kind, target.targetId, formatSqliteDatetime())
    .run();
  return true;
}

export async function removeFavorite(
  env: Env,
  userId: number,
  target: FavoriteTarget,
): Promise<void> {
  await env.DB.prepare("DELETE FROM favorites WHERE owner_id = ? AND kind = ? AND target_id = ?")
    .bind(String(userId), target.kind, target.targetId)
    .run();
}
