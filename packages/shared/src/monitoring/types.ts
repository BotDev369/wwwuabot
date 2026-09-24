/**
 * Типи моніторингу проєкту — спільні для того, хто **збирає** зріз (`api-dev`),
 * і того, хто його **показує** (`web-admin-dev`).
 *
 * **Чому це в shared.** Форма зрізу — це контракт між воркером і сторінкою:
 * якщо кожен опише її собі, то перше ж перейменування поля в контролері
 * пройде компіляцію в обох місцях окремо, а зламається лише в браузері.
 * Правило «двічі — в спільне» (AGENTS.md §3) тут спрацьовує на типах, а не
 * на логіці: жодного запиту до D1 чи KV у цьому модулі немає.
 *
 * **Значення — це пари (група, метрика), а не колонки.** Зріз зберігається
 * довгими рядками (`metrics_values`), бо набір показників росте: сьогодні це
 * код і GitHub, далі — D1, KV, R2, воркери. Додати показник означає додати
 * рядок у реєстр метрик, а не колонку в таблицю (AGENTS.md §7).
 *
 * @module @wwwuabot/shared/monitoring/types
 */

/** Група загальних показників проєкту — те, що не розбите по воркспейсах. */
export const TOTAL_GROUP = "total";

/** Одне виміряне значення: показник у групі (`total` або ім'я воркспейса). */
export interface MetricValue {
  readonly group: string;
  readonly metric: string;
  readonly value: number;
}

/** Хто запустив збір: людина з панелі чи розклад (`crons` у `wrangler.toml`). */
export type CollectTrigger = "manual" | "cron";

/**
 * Стан зрізу.
 *
 * `partial` — це не прикраса: якщо GitHub відповів, а тека-архів не приїхала,
 * зріз **існує** (кількість зірок виміряна), але неповний. Мовчки записувати
 * його як `ok` означало б показувати нулі там, де насправді «не змогли».
 */
export type SnapshotStatus = "ok" | "partial" | "error";

export type CollectorStatus = "ok" | "error" | "skipped";

/** Що саме робив один колектор — видно на сторінці, а не лише в логах. */
export interface CollectorReport {
  readonly id: string;
  readonly label: string;
  readonly status: CollectorStatus;
  readonly durationMs: number;
  /** Причина невдачі або пояснення, чому колектор нічого не робив. */
  readonly message?: string;
}

/** Один зріз показників: коли, чим, з яким результатом і що саме виміряно. */
export interface MonitoringSnapshot {
  readonly id: number;
  /** ISO-8601 (UTC) — момент збору. */
  readonly collectedAt: string;
  readonly trigger: CollectTrigger;
  readonly status: SnapshotStatus;
  /** Коміт, на який зібрано зріз (`null`, якщо GitHub недоступний). */
  readonly ref: string | null;
  readonly collectors: readonly CollectorReport[];
  readonly values: readonly MetricValue[];
}

/**
 * Точка історії — те, що потрібне для графіка й таблиці зрізів.
 *
 * Тільки `total`: історія по кожному воркспейсу — це вже інший екран
 * (порівняння груп), а таблиця зрізів мусить лишатись легкою.
 */
export interface SnapshotPoint {
  readonly id: number;
  readonly collectedAt: string;
  readonly status: SnapshotStatus;
  readonly trigger: CollectTrigger;
  /** Короткий хеш коміту — щоб було видно, на чому саме зібрано зріз. */
  readonly ref: string | null;
  readonly totals: Readonly<Record<string, number>>;
}

/** Стан джерел: **що налаштовано**, без жодного значення секрету. */
export interface MonitoringSources {
  readonly repo: string;
  /** Чи бачить `api-dev` токен GitHub (для приватного репозиторію він обов'язковий). */
  readonly githubTokenConfigured: boolean;
  /** Секрет Cloudflare — знадобиться для збору по D1/KV/воркерах (етап 2). */
  readonly cloudflareConfigured: boolean;
  /** Розклад автоматичного збору з `wrangler.toml`, якщо він є. */
  readonly cronSchedule: string | null;
}

/** Те, що сторінка моніторингу отримує одним запитом. */
export interface MonitoringSummary {
  readonly sources: MonitoringSources;
  readonly latest: MonitoringSnapshot | null;
  readonly previous: MonitoringSnapshot | null;
  readonly history: readonly SnapshotPoint[];
}
