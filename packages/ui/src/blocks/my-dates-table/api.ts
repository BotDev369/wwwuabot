/**
 * API helpers for MyDatesTable block.
 *
 * Ідентичність — підписаний Telegram `initData` зі спільного модуля безпеки.
 * Раніше блок надсилав голий `X-Telegram-User-Id`, який сервер приймав без
 * перевірки підпису.
 *
 * @module packages/ui/src/blocks/my-dates-table/api
 */

import type { MyDate } from "./types";
import { telegramAuthHeaders } from "@wwwuabot/shared/security/telegram";

export async function fetchMyDates(): Promise<MyDate[]> {
  const res = await fetch("/api/my-dates", { headers: telegramAuthHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка завантаження");
  return data.dates;
}

export async function saveMyDate(dateData: Partial<MyDate>): Promise<void> {
  const isCreate = !dateData.id;
  const res = await fetch("/api/my-dates", {
    method: isCreate ? "POST" : "PUT",
    headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
    body: JSON.stringify(dateData),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка збереження");
}

export async function deleteMyDate(id: string): Promise<void> {
  const res = await fetch(`/api/my-dates?id=${id}`, {
    method: "DELETE",
    headers: telegramAuthHeaders(),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка видалення");
}

export async function deleteMyDates(ids: string[]): Promise<void> {
  const res = await fetch(`/api/my-dates?ids=${ids.join(",")}`, {
    method: "DELETE",
    headers: telegramAuthHeaders(),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка видалення");
}
