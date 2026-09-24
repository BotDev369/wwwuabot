/**
 * Збір зрізу: хто що міряє, у якому порядку й що робити, коли частина впала.
 *
 * **Один зріз = кілька колекторів, і невдача одного не скасовує інших.** Якщо
 * GitHub відповів, а архів не приїхав, зірки й коміти виміряні — записати зріз
 * як `error` означало б викинути те, що справді зібрано. Тому кожен колектор
 * має власний стан у звіті, а загальний стан зрізу — похідна від них.
 *
 * **Розклад і ручний запуск — той самий шлях.** `POST /api/admin/monitoring/collect`
 * і `scheduled()` клинуть цю саму функцію; різниця лише в `trigger`, який
 * лишається в зрізі. Двох реалізацій збору не існує, тож «ручний зріз чомусь
 * інший» неможливо.
 *
 * @module api-dev/src/services/monitoring/collect
 */

import {
  type CollectTrigger,
  type CollectorReport,
  type MetricValue,
  type SnapshotStatus,
} from "@wwwuabot/shared/monitoring";
import type { Env } from "../../shared/types";
import { apiLog } from "../../shared/logger";
import { collectCode, type CollectorResult } from "./code-collector";
import { fetchRepoStats } from "./github";

/** Репозиторій за замовчуванням — значення для `MONITOR_GITHUB_REPO`. */
export const DEFAULT_REPO = "BotDev369/wwwuabot";

/**
 * Розклад автоматичного збору.
 *
 * Той самий рядок стоїть у `[triggers]` `api-dev/wrangler.toml`: тут він для
 * того, щоб сторінка могла показати його людині, не читаючи конфіг. Розійтись
 * вони можуть — тож розклад показується як **заявлений**, а коли зріз справді
 * прийде за розкладом, це видно в його `trigger`.
 */
export const CRON_SCHEDULE = "17 4 * * *";

export interface CollectionOutcome {
  readonly status: SnapshotStatus;
  readonly ref: string | null;
  readonly collectors: CollectorReport[];
  readonly values: MetricValue[];
}

/** Репозиторій із змінної оточення; порожнє значення = типовий. */
export function repoSlug(env: Env): string {
  return env.MONITOR_GITHUB_REPO?.trim() || DEFAULT_REPO;
}

/** Один колектор: час, стан і те, що він дав. Помилка лишається в звіті. */
async function runCollector(
  report: { id: string; label: string },
  action: () => Promise<CollectorResult>,
  into: { collectors: CollectorReport[]; values: MetricValue[] },
): Promise<void> {
  const started = Date.now();
  try {
    const result = await action();
    into.values.push(...result.values);
    into.collectors.push({
      id: report.id,
      label: report.label,
      status: "ok",
      durationMs: Date.now() - started,
      ...(result.note ? { message: result.note } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    apiLog.error(`monitoring: колектор «${report.id}» упав`, error);
    into.collectors.push({
      id: report.id,
      label: report.label,
      status: "error",
      durationMs: Date.now() - started,
      message,
    });
  }
}

/**
 * Збирає зріз із усіх колекторів.
 *
 * Порядок навмисний: спершу GitHub (він дає `ref` — коміт), потім код із
 * архіву **на цьому ж коміті**. Так «зріз на коміті X» — це правда, а не
 * здогад про те, що гілка не змінилась за секунду між запитами.
 */
export async function collectSnapshot(
  env: Env,
  trigger: CollectTrigger,
): Promise<CollectionOutcome> {
  const repo = repoSlug(env);
  const into = { collectors: [] as CollectorReport[], values: [] as MetricValue[] };
  let ref: string | null = null;

  await runCollector(
    { id: "github", label: "Репозиторій (GitHub API)" },
    async () => {
      const stats = await fetchRepoStats(repo, env.GITHUB_MONITOR_TOKEN);
      ref = stats.ref;
      return { values: stats.values, note: stats.notes.join("; ") || undefined };
    },
    into,
  );

  await runCollector(
    { id: "code", label: "Код (архів гілки)" },
    () => collectCode(repo, env.GITHUB_MONITOR_TOKEN, ref),
    into,
  );

  // Cloudflare-колектори (D1, KV, R2, воркери) — наступний крок. Звіт каже
  // про це чесно: «пропущено» видно на сторінці, а не лише в планах.
  into.collectors.push({
    id: "cloudflare",
    label: "Cloudflare (D1, KV, R2, воркери)",
    status: "skipped",
    durationMs: 0,
    message: "ще не реалізовано — наступний крок",
  });

  const failed = into.collectors.filter((collector) => collector.status === "error").length;
  const ran = into.collectors.filter((collector) => collector.status !== "skipped").length;
  const status: SnapshotStatus = failed === 0 ? "ok" : failed === ran ? "error" : "partial";

  apiLog.info("monitoring: зріз зібрано", {
    trigger,
    repo,
    ref,
    status,
    values: into.values.length,
    groups: new Set(into.values.map((value) => value.group)).size,
  });

  return { status, ref, collectors: into.collectors, values: into.values };
}
