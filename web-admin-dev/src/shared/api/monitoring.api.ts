/**
 * Виклики моніторингу з панелі.
 *
 * Ті самі `/api/admin/*`-шляхи, що й у решти адмінки: cookie-сесія їде
 * автоматично, а 401 обробляє спільний `apiFetch` — сторінка моніторингу не
 * має власного способу авторизації (той самий адмін-гейт у `api-dev`).
 *
 * Збір — окремий виклик, а не частина читання: він ходить у GitHub і розбирає
 * архів гілки, тож відкриття сторінки не мусить його чекати.
 *
 * @module web-admin-dev/src/shared/api/monitoring.api
 */

import type { MonitoringSnapshot, MonitoringSummary } from "@wwwuabot/shared/monitoring";
import { apiFetch } from "./client";

/** Усе для сторінки: джерела, останній зріз, попередній і історія. */
export function fetchMonitoringSummary(): Promise<MonitoringSummary> {
  return apiFetch<MonitoringSummary>("/api/admin/monitoring/summary");
}

/** Зібрати зріз зараз — те саме, що робить розклад у `api-dev`. */
export function collectMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  return apiFetch<MonitoringSnapshot>("/api/admin/monitoring/collect", { method: "POST" });
}
