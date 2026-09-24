/**
 * Рядок бази ↔ зріз: переклад між D1 і формою зрізу.
 *
 * Окремий модуль, бо цим користуються **обидва** боки — запис і читання: якби
 * кожен мав свою копію розбору, перше ж перейменування колонки дало б зріз,
 * який читається інакше, ніж пишеться (і жоден гейт цього не бачить).
 *
 * `SELECT` перелічує колонки за іменами, а не `SELECT *`: у `collectors` може
 * лежати довгий JSON, і тягнути його туди, де він не потрібен (напр. у
 * графік), — зайва робота D1.
 *
 * @module api-dev/src/services/monitoring/rows
 */

import type {
  CollectTrigger,
  CollectorReport,
  MetricValue,
  MonitoringSnapshot,
  SnapshotStatus,
} from "@wwwuabot/shared/monitoring";
import type { Env } from "../../shared/types";

/** Колонки зрізу — один рядок на всі читачі. */
export const SNAPSHOT_COLUMNS = "id, collected_at, trigger_kind, status, git_ref, collectors";

export interface SnapshotRow {
  id: number;
  collected_at: string;
  trigger_kind: string;
  status: string;
  git_ref: string | null;
  collectors: string | null;
}

export interface ValueRow {
  snapshot_id: number;
  group_key: string;
  metric: string;
  value: number;
}

/** Колектори лежать у D1 як JSON: це частина зрізу, а не окрема таблиця. */
export function parseCollectors(raw: string | null): CollectorReport[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CollectorReport[]) : [];
  } catch {
    // Зріз, у якого не читається звіт колекторів, усе одно має числа.
    return [];
  }
}

export function asStatus(value: string): SnapshotStatus {
  return value === "ok" || value === "partial" ? value : "error";
}

export function asTrigger(value: string): CollectTrigger {
  return value === "cron" ? "cron" : "manual";
}

export function toSnapshot(row: SnapshotRow, values: MetricValue[]): MonitoringSnapshot {
  return {
    id: row.id,
    collectedAt: row.collected_at,
    trigger: asTrigger(row.trigger_kind),
    status: asStatus(row.status),
    ref: row.git_ref,
    collectors: parseCollectors(row.collectors),
    values,
  };
}

/** Усі значення одного зрізу. */
export async function snapshotValues(env: Env, snapshotId: number): Promise<MetricValue[]> {
  const result = await env.DB.prepare(
    "SELECT snapshot_id, group_key, metric, value FROM metrics_values WHERE snapshot_id = ?",
  )
    .bind(snapshotId)
    .all<ValueRow>();
  return (result.results ?? []).map((row) => ({
    group: row.group_key,
    metric: row.metric,
    value: row.value,
  }));
}
