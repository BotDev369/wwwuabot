/**
 * Сховища колектора: D1 (таблиці й курсор), R2 (сирі відповіді).
 *
 * Запис ідемпотентний: ключ рядка — `id` джерела, тому повторний прогін
 * оновлює запис, а не плодить дубль. Курсор живе в `spending_sync`, а не в
 * пам'яті: обірваний прогін продовжується з того місця, де спинився.
 * @module api-dev/src/services/spending/store
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import type { TableName } from "@wwwuabot/shared/database/tables";

/** Таблиці цього домену — створюються раз, перед першим записом. */
export const SPENDING_TABLES = [
  "spending_orgs",
  "spending_regions",
  "spending_counterparties",
  "spending_documents",
  "spending_transactions",
  "spending_sync",
] as const satisfies readonly TableName[];

/** Скільки тверджень відправляти одним `batch`: більші пачки D1 рве по таймауту. */
const BATCH_SIZE = 50;

export async function ensureSpendingTables(db: D1Database): Promise<void> {
  await ensureTables(db, SPENDING_TABLES);
}

/** Стан кроку синхронізації; `ok` означає «цей період уже зібрано». */
export type SyncStatus = "running" | "ok" | "error";

export interface SyncUpdate {
  readonly key: string;
  readonly kind: string;
  readonly period: string;
  readonly status: SyncStatus;
  readonly rows?: number;
  readonly error?: string;
}

/**
 * Чи крок уже закритий. З `maxAgeMs` крок закритий лише доти, доки його
 * завершення свіже: інакше доопубліковані джерелом рядки не доїдуть ніколи.
 */
export async function isSettled(db: D1Database, key: string, maxAgeMs?: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT status, finished_at FROM spending_sync WHERE key = ?")
    .bind(key)
    .first<{ status: string; finished_at: string | null }>();
  if (row?.status !== "ok") return false;
  if (maxAgeMs === undefined) return true;
  const finished = row.finished_at ? Date.parse(row.finished_at) : Number.NaN;
  return Number.isFinite(finished) && Date.now() - finished <= maxAgeMs;
}

export async function markSync(db: D1Database, update: SyncUpdate): Promise<void> {
  const now = new Date().toISOString();
  const finishedAt = update.status === "running" ? null : now;
  await db
    .prepare(
      `INSERT INTO spending_sync (key, kind, period, status, rows, started_at, finished_at, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         status = excluded.status,
         rows = excluded.rows,
         started_at = excluded.started_at,
         finished_at = excluded.finished_at,
         error = excluded.error`,
    )
    .bind(
      update.key,
      update.kind,
      update.period,
      update.status,
      update.rows ?? 0,
      now,
      finishedAt,
      update.error ?? "",
    )
    .run();
}

/** Пачка тверджень: 50 за раз, бо ширший `batch` D1 рве по таймауту. */
export async function runBatched(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let index = 0; index < statements.length; index += BATCH_SIZE) {
    await db.batch(statements.slice(index, index + BATCH_SIZE));
  }
}

/**
 * Сира відповідь у R2: ті самі байти, що прийшли, без повторної серіалізації.
 *
 * Раніше тіло парсилось, а потім серіалізувалось назад: на великому
 * розпоряднику це дві зайві копії в пам'яті воркера (стеля 128 МБ).
 */
export async function archiveRaw(bucket: R2Bucket, key: string, body: Uint8Array): Promise<number> {
  const stream = new Response(body).body;
  if (!stream) throw new Error(`R2: не вдалося стиснути «${key}».`);
  const gzipped = new Uint8Array(
    await new Response(stream.pipeThrough(new CompressionStream("gzip"))).arrayBuffer(),
  );
  await bucket.put(key, gzipped, {
    httpMetadata: { contentType: "application/json", contentEncoding: "gzip" },
  });
  return gzipped.byteLength;
}
