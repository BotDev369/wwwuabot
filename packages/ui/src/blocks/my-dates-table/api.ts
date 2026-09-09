/**
 * API helpers for MyDatesTable block.
 */

import type { MyDate } from "./types";

function getTelegramUserId(): number | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const userId = getTelegramUserId();
  if (!userId) throw new Error("Not authenticated");
  return { "X-Telegram-User-Id": String(userId) };
}

export async function fetchMyDates(): Promise<MyDate[]> {
  const userId = getTelegramUserId();
  if (!userId) return [];
  const res = await fetch("/api/my-dates", {
    headers: { "X-Telegram-User-Id": String(userId) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка завантаження");
  return data.dates;
}

export async function saveMyDate(dateData: Partial<MyDate>): Promise<void> {
  const headers = authHeaders();
  const isCreate = !dateData.id;
  const res = await fetch("/api/my-dates", {
    method: isCreate ? "POST" : "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(dateData),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка збереження");
}

export async function deleteMyDate(id: string): Promise<void> {
  const headers = authHeaders();
  const res = await fetch(`/api/my-dates?id=${id}`, {
    method: "DELETE",
    headers,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка видалення");
}

export async function deleteMyDates(ids: string[]): Promise<void> {
  const headers = authHeaders();
  const res = await fetch(`/api/my-dates?ids=${ids.join(",")}`, {
    method: "DELETE",
    headers,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка видалення");
}
