/**
 * Підписи й класи для сторінки моніторингу.
 *
 * Окремо від компонентів, бо це чисті функції без стану (AGENTS.md §3) і
 * тому саме вони тестуються: «що покаже сторінка, коли токена немає» — це
 * рішення, а не верстка.
 *
 * @module web-admin-dev/src/pages/monitoring/format
 */

import type { CollectTrigger, CollectorStatus, SnapshotStatus } from "@wwwuabot/shared/monitoring";

/** Дата й час зрізу — коротко, у місцевому часі читача. */
export function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Скільки часу минуло — одним рядком, без секунд. */
export function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "щойно";
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "вчора" : `${days} дн тому`;
}

/** Короткий хеш коміту — рівно стільки, скільки треба, щоб упізнати. */
export function shortRef(ref: string | null): string {
  return ref ? ref.slice(0, 7) : "—";
}

/** Тривалість збору — у мілісекундах або секундах, без «0.001 с». */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} мс`;
  return `${(ms / 1000).toFixed(1)} с`;
}

export function triggerLabel(trigger: CollectTrigger): string {
  return trigger === "cron" ? "за розкладом" : "вручну";
}

export function statusLabel(status: SnapshotStatus): string {
  if (status === "ok") return "повний";
  if (status === "partial") return "частковий";
  return "невдалий";
}

export function collectorStatusLabel(status: CollectorStatus): string {
  if (status === "ok") return "зібрано";
  if (status === "skipped") return "пропущено";
  return "помилка";
}

/** Клас бейджа стану: колір — це рішення, і воно в одному місці. */
export function statusClass(status: SnapshotStatus | CollectorStatus): string {
  if (status === "ok") return "mon-status-ok";
  if (status === "error") return "mon-status-error";
  return "mon-status-partial";
}

/**
 * Клас зміни показника.
 *
 * Напрямок **не** означає «добре»: у показників із `trend: "up"` зростання
 * зелене, у нейтральних (розмір коду, відкриті issue) воно лишається сірим.
 * Фарбувати нейтральний ріст зеленим означало б хвалити те, що не є
 * досягненням.
 */
export function deltaClass(trend: string, delta: number | undefined): string {
  if (delta === undefined || delta === 0) return "mon-kpi-delta--flat";
  if (trend !== "up") return "mon-kpi-delta--flat";
  return delta > 0 ? "mon-kpi-delta--up" : "mon-kpi-delta--down";
}
