/**
 * Запис зрізу: рядок у D1, значення пакетами, останній зріз у KV.
 *
 * **Чому два сховища, і чому це не дубль.** D1 тримає всі зрізи — саме вона є
 * джерелом правди для історії. KV тримає **один** рядок, останній зріз, бо
 * сторінка відкривається часто, а «дай останнє» перетворюється на два запити
 * до D1 (рядок зрізу + його значення) щоразу. Другого джерела істини не
 * виникає: `readLatest` уміє відновити KV із D1 (див. `read.ts`).
 *
 * **Запис значень — пакетами.** У зрізі десятки рядків, і кожен окремий
 * `await` означав би десятки послідовних звернень до D1. `db.batch` шле їх
 * одним кроком; межа в 40 — щоб одна невдала вставка не тягнула весь зріз.
 *
 * @module api-dev/src/services/monitoring/store
 */

import type { CollectTrigger, MonitoringSnapshot } from "@wwwuabot/shared/monitoring";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import type { Env } from "../../shared/types";
import { apiLog } from "../../shared/logger";
import type { CollectionOutcome } from "./collect";

/** Ключ останнього зрізу в KV. Один — бо зріз один. */
export const LATEST_KEY = "monitoring:repo:latest";

/** Стеля пакета вставок: D1 приймає пачку, але не безмежну. */
const BATCH_SIZE = 40;

/**
 * Пише зріз: D1 → значення → KV.
 *
 * Порядок саме такий: KV оновлюється **останнім**, коли числа вже на місці.
 * Інакше сторінка могла б побачити «останній» зріз, у якого ще немає значень.
 */
export async function saveSnapshot(
  env: Env,
  outcome: CollectionOutcome,
  trigger: CollectTrigger,
): Promise<MonitoringSnapshot> {
  await ensureTables(env.DB, ["metrics_snapshots", "metrics_values"]);

  const collectedAt = new Date().toISOString();
  const inserted = await env.DB.prepare(
    "INSERT INTO metrics_snapshots (collected_at, trigger_kind, status, git_ref, collectors) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(collectedAt, trigger, outcome.status, outcome.ref, JSON.stringify(outcome.collectors))
    .run();

  const id = inserted.meta?.last_row_id ?? 0;
  if (!id) apiLog.error("monitoring: D1 не повернула id зрізу");

  for (let i = 0; i < outcome.values.length; i += BATCH_SIZE) {
    const chunk = outcome.values.slice(i, i + BATCH_SIZE);
    await env.DB.batch(
      chunk.map((value) =>
        env.DB.prepare(
          "INSERT INTO metrics_values (snapshot_id, group_key, metric, value) VALUES (?, ?, ?, ?)",
        ).bind(id, value.group, value.metric, value.value),
      ),
    );
  }

  const snapshot: MonitoringSnapshot = {
    id,
    collectedAt,
    trigger,
    status: outcome.status,
    ref: outcome.ref,
    collectors: outcome.collectors,
    values: outcome.values,
  };

  await env.CONTENT_KV.put(LATEST_KEY, JSON.stringify(snapshot));
  return snapshot;
}
