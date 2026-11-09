import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { toWebPath } from "@wwwuabot/shared/content";
import { pageAdminIds, pageRole } from "@wwwuabot/shared/pages";
import type { FavoriteItem, FavoriteTarget } from "@wwwuabot/shared/favorites";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Env } from "../shared/types";
import { PublicProfileService } from "./public-profile.service";

/** Те, що можна сказати про ціль; дату додавання додає лише список. */
export type ResolvedFavorite = Omit<FavoriteItem, "savedAt">;

/** Скільки id в одному `IN (…)`: D1 має межу на зв'язані параметри запиту. */
const IDS_PER_QUERY = 50;

function chunksOf(ids: readonly number[]): number[][] {
  const unique = [...new Set(ids)];
  const parts: number[][] = [];
  for (let start = 0; start < unique.length; start += IDS_PER_QUERY) {
    parts.push(unique.slice(start, start + IDS_PER_QUERY));
  }
  return parts;
}

/** Рядок `scenarios`, якого досить для картки; зайвих колонок не читаємо. */
interface ScenarioRow {
  id: number;
  slug: string;
  title: string | null;
  photo_url: string | null;
  owner_id: string | null;
  admin_ids: string | null;
  is_public: number | null;
}

/**
 * Сторінки з обраного — **один запит на пачку id**, а не на рядок.
 *
 * Видимість перевіряє SQL (він же відсікає неактивні), а `LIKE` лише звужує
 * кандидатів: точне право власника чи адміна перевіряє спільне правило нижче.
 */
async function resolvePages(
  env: Env,
  userId: number,
  ids: readonly number[],
): Promise<Map<number, ResolvedFavorite>> {
  const found = new Map<number, ResolvedFavorite>();
  if (ids.length === 0) return found;
  await ensureTables(env.DB, ["scenarios"]);

  for (const part of chunksOf(ids)) {
    const placeholders = part.map(() => "?").join(", ");
    const rows = await env.DB.prepare(
      `SELECT id, slug, title, photo_url, owner_id, admin_ids, is_public FROM scenarios
       WHERE id IN (${placeholders}) AND is_active = 1
         AND (owner_id IS NULL OR COALESCE(is_public, 0) = 1 OR owner_id = ? OR admin_ids LIKE ?)`,
    )
      .bind(...part, String(userId), `%${userId}%`)
      .all<ScenarioRow>();

    for (const row of rows.results ?? []) {
      const managed = pageRole(Number(row.owner_id), pageAdminIds(row.admin_ids), userId) !== null;
      if (row.owner_id !== null && Number(row.is_public) !== 1 && !managed) continue;
      // Відкрита сторінка відкривається **як її бачать інші** — за адресою, а не
      // екраном налаштувань. Власнику він теж не потрібен: право власника не
      // робить із перегляду редагування (docs/VISIBILITY.md).
      const open = row.owner_id === null || Number(row.is_public) === 1;
      found.set(Number(row.id), {
        kind: "page",
        targetId: Number(row.id),
        title: row.title || "Сторінка",
        photoUrl: row.photo_url,
        href: open ? toWebPath(row.slug) : `/pages/${row.id}`,
      });
    }
  }
  return found;
}

/** Люди з обраного — пачками й тим самим публічним поданням, що й стрічка. */
async function resolveUsers(
  env: Env,
  ids: readonly number[],
): Promise<Map<number, ResolvedFavorite>> {
  const found = new Map<number, ResolvedFavorite>();
  if (ids.length === 0) return found;
  const profiles = await new PublicProfileService(env).readPublicMany(ids);

  for (const [id, profile] of profiles) {
    found.set(id, {
      kind: "user",
      targetId: id,
      title: profile.platformUsername ? `#${profile.platformUsername}` : "Ім'я приховано",
      photoUrl: profile.photoUrl ?? null,
      // Адреси в людини немає: її показують карткою у списку, а не окремою
      // сторінкою, тож відкривати з «Обраного» нічого — значення те саме, що
      // в недоступного контенту.
      href: null,
    });
  }
  return found;
}

/** Одна ціль — той самий шлях, що й список: запит на вид цілі, не на рядок. */
export async function resolveFavorite(
  env: Env,
  userId: number,
  target: FavoriteTarget,
): Promise<ResolvedFavorite | null> {
  const resolved =
    target.kind === "user"
      ? await resolveUsers(env, [target.targetId])
      : await resolvePages(env, userId, [target.targetId]);
  return resolved.get(target.targetId) ?? null;
}

export async function listFavorites(env: Env, userId: number): Promise<FavoriteItem[]> {
  const rows = await env.DB.prepare(
    "SELECT kind, target_id, created_at FROM favorites WHERE owner_id = ? ORDER BY id DESC LIMIT 200",
  )
    .bind(String(userId))
    .all<{ kind: FavoriteTarget["kind"]; target_id: number; created_at: string | null }>();

  const saved = rows.results ?? [];
  const idsOf = (kind: FavoriteTarget["kind"]) =>
    saved.filter((row) => row.kind === kind).map((row) => row.target_id);
  const [pages, users] = await Promise.all([
    resolvePages(env, userId, idsOf("page")),
    resolveUsers(env, idsOf("user")),
  ]);

  // Недоступне обране не розкриває навіть стару назву; видалити лайк можна завжди.
  return saved.map((row) => {
    const target: FavoriteTarget = { kind: row.kind, targetId: row.target_id };
    const resolved = (row.kind === "page" ? pages : users).get(target.targetId);
    const item = resolved ?? {
      ...target,
      title: "Контент недоступний",
      href: null,
      photoUrl: null,
    };
    return { ...item, savedAt: row.created_at ?? null };
  });
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
