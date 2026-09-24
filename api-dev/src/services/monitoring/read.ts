/**
 * Читання зрізів: останній, попередній, історія й стан джерел.
 *
 * **Останній зріз читається з KV, історія — з D1.** Це не два джерела правди:
 * KV — кеш одного рядка, і якщо він порожній (або записаний не до кінця), зріз
 * відновлюється з D1 і кеш полагоджується сам. Інакше після кожного деплою з
 * новим неймспейсом сторінка показувала б «зрізів немає» при живих даних.
 *
 * `HISTORY_LIMIT` — стеля історії: графік і таблиця читають її цілком, і
 * тягнути всі зрізи за два роки означало б платити за те, чого не видно.
 *
 * @module api-dev/src/services/monitoring/read
 */

import {
  TOTAL_GROUP,
  valueKey,
  type MonitoringSnapshot,
  type MonitoringSources,
  type MonitoringSummary,
  type SnapshotPoint,
} from "@wwwuabot/shared/monitoring";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import type { Env } from "../../shared/types";
import { CRON_SCHEDULE, repoSlug } from "./collect";
import { LATEST_KEY } from "./store";
import {
  SNAPSHOT_COLUMNS,
  asStatus,
  asTrigger,
  snapshotValues,
  toSnapshot,
  type SnapshotRow,
  type ValueRow,
} from "./rows";

/** Скільки зрізів показує історія за замовчуванням (графік + таблиця). */
export const HISTORY_LIMIT = 30;

/** Останній зріз: спершу KV, потім D1 (і KV полагоджується). */
export async function readLatest(env: Env): Promise<MonitoringSnapshot | null> {
  const cached = await env.CONTENT_KV.get<MonitoringSnapshot>(LATEST_KEY, "json");
  if (cached && typeof cached.id === "number") return cached;

  const row = await env.DB.prepare(
    `SELECT ${SNAPSHOT_COLUMNS} FROM metrics_snapshots ORDER BY id DESC LIMIT 1`,
  ).first<SnapshotRow>();
  if (!row) return null;

  const snapshot = toSnapshot(row, await snapshotValues(env, row.id));
  await env.CONTENT_KV.put(LATEST_KEY, JSON.stringify(snapshot));
  return snapshot;
}

/** Зріз, що передує даному, — з нього рахується зміна показників. */
export async function readPrevious(env: Env, id: number): Promise<MonitoringSnapshot | null> {
  const row = await env.DB.prepare(
    `SELECT ${SNAPSHOT_COLUMNS} FROM metrics_snapshots WHERE id < ? ORDER BY id DESC LIMIT 1`,
  )
    .bind(id)
    .first<SnapshotRow>();
  if (!row) return null;
  return toSnapshot(row, await snapshotValues(env, row.id));
}

/**
 * Історія зрізів: спершу останні, у кожного — тільки `total`.
 *
 * **Ключ точки — `група|метрика`, той самий, що й у решті зрізу.** Це не
 * дрібниця: `totals` читають `metricSeries` і `SnapshotHistory`, і якщо ключ
 * тут скласти з самої метрики, словник виглядатиме заповненим, а кожне число
 * у графіку й таблиці стане нулем — типи цього не побачать
 * (`Record<string, number>` приймає обидва формати). Тому ключ один на весь
 * проєкт і береться зі `valueKey`.
 */
export async function readHistory(env: Env, limit = HISTORY_LIMIT): Promise<SnapshotPoint[]> {
  const rows = await env.DB.prepare(
    `SELECT ${SNAPSHOT_COLUMNS} FROM metrics_snapshots ORDER BY id DESC LIMIT ?`,
  )
    .bind(limit)
    .all<SnapshotRow>();
  const found = rows.results ?? [];
  if (found.length === 0) return [];

  // Одним запитом на всю історію: `snapshot_id >= ?` лягає на PRIMARY KEY, а
  // окремий запит на кожен зріз був би N+1 на рівному місці.
  const oldest = found[found.length - 1].id;
  const values = await env.DB.prepare(
    "SELECT snapshot_id, group_key, metric, value FROM metrics_values WHERE group_key = ? AND snapshot_id >= ?",
  )
    .bind(TOTAL_GROUP, oldest)
    .all<ValueRow>();

  const totalsBySnapshot = new Map<number, Record<string, number>>();
  for (const row of values.results ?? []) {
    const bucket = totalsBySnapshot.get(row.snapshot_id) ?? {};
    bucket[valueKey(row.group_key, row.metric)] = row.value;
    totalsBySnapshot.set(row.snapshot_id, bucket);
  }

  return found.map((row) => ({
    id: row.id,
    collectedAt: row.collected_at,
    status: asStatus(row.status),
    trigger: asTrigger(row.trigger_kind),
    ref: row.git_ref,
    totals: totalsBySnapshot.get(row.id) ?? {},
  }));
}

/** Що налаштовано в джерелах — без жодного значення секрету. */
export function readSources(env: Env): MonitoringSources {
  return {
    repo: repoSlug(env),
    githubTokenConfigured: Boolean(env.GITHUB_MONITOR_TOKEN),
    cloudflareConfigured: Boolean(env.CF_MONITOR_TOKEN && env.MONITOR_CF_ACCOUNT_ID),
    cronSchedule: CRON_SCHEDULE,
  };
}

/** Усе, що потрібно сторінці, — одним запитом до воркера. */
export async function readSummary(
  env: Env,
  historyLimit = HISTORY_LIMIT,
): Promise<MonitoringSummary> {
  await ensureTables(env.DB, ["metrics_snapshots", "metrics_values"]);

  const latest = await readLatest(env);
  const [previous, history] = await Promise.all([
    latest ? readPrevious(env, latest.id) : Promise.resolve(null),
    readHistory(env, historyLimit),
  ]);

  return { sources: readSources(env), latest, previous, history };
}
