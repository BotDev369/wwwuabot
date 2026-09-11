/**
 * API дат («Мої дати»).
 *
 * Ідентичність бере api-dev із підписаного Telegram `initData`, який додає
 * `apiFetchRaw`. Раніше тут передавався голий `X-Telegram-User-Id`, і сервер
 * його приймав — тобто будь-хто міг читати чужі дати (див.
 * docs/CONSOLIDATION_PLAN.md §5.3в).
 *
 * @module web-platform-dev/src/shared/api/mydate.api
 */

import { apiFetchRaw } from "./client";

export interface MyDate {
  id: string;
  user_id: number;
  date: string;
  type: string;
  name: string;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  alias?: string;
  category?: string;
}

export interface SystemCard {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  parameters?: { key: string; label: string }[];
}

export interface SystemResult {
  parameters: { key: string; label: string; value: string }[];
  comingSoon: string[];
}

/** Усі дати поточного користувача. */
export async function fetchMyDates(): Promise<MyDate[]> {
  const res = await apiFetchRaw("/api/my-dates");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка завантаження");
  return data.dates;
}

/** Створити або оновити дату. */
export async function saveMyDate(dateData: Partial<MyDate>): Promise<void> {
  const isCreate = !dateData.id;
  const res = await apiFetchRaw("/api/my-dates", {
    method: isCreate ? "POST" : "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dateData),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка збереження");
}

/** Видалити одну дату. */
export async function deleteMyDate(id: string): Promise<void> {
  const res = await apiFetchRaw(`/api/my-dates?id=${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка видалення");
}

/** Видалити кілька дат. */
export async function deleteMyDates(ids: string[]): Promise<void> {
  const res = await apiFetchRaw(`/api/my-dates?ids=${ids.join(",")}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка видалення");
}

/** Доступні системи аналізу. */
export async function fetchSystems(): Promise<SystemCard[]> {
  const res = await apiFetchRaw("/api/mydate/systems");
  const data = await res.json();
  return data?.ok ? data.systems : [];
}

/** Аналіз однієї дати конкретною системою. */
export async function analyzeDate(
  date: string,
  systemId: string,
): Promise<SystemResult> {
  const res = await apiFetchRaw("/api/mydate/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, systemId }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error ?? "Помилка аналізу");
  return data.result;
}

/** Аналіз дати за всіма системами. */
export async function fetchAnalysis(
  date: string,
): Promise<Record<string, SystemResult>> {
  const res = await apiFetchRaw(`/api/mydate/analysis/${date}`);
  const data = await res.json();
  return data?.ok ? data.systems : {};
}

/** Співставлення кількох дат за системами. */
export async function compareDates(
  dates: string[],
  systemIds?: string[],
  parameterKeys?: string[],
): Promise<Record<string, Record<string, Record<string, string>>>> {
  const res = await apiFetchRaw("/api/mydate/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dates, systemIds, parameterKeys }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error ?? "Помилка співставлення");
  return data.matrix;
}
