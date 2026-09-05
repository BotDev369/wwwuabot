

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

/**
 * Get Telegram user ID from TWA SDK.
 */
export function getTelegramUserId(): number | null {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Signed Telegram initData — the API verifies its HMAC and takes user.id
 * from there; the plain user id header is only a transitional fallback.
 */
function authHeaders(userId: number): Record<string, string> {
  const headers: Record<string, string> = { "X-Telegram-User-Id": String(userId) };
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) headers["X-Telegram-Init-Data"] = initData;
  return headers;
}

/**
 * Fetch all dates for the current user.
 */
export async function fetchMyDates(): Promise<MyDate[]> {
  const userId = getTelegramUserId();
  if (!userId) return [];

  const res = await fetch("/api/my-dates", {
    headers: authHeaders(userId),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка завантаження");
  return data.dates;
}

/**
 * Create or update a date.
 */
export async function saveMyDate(dateData: Partial<MyDate>): Promise<void> {
  const userId = getTelegramUserId();
  if (!userId) throw new Error("Not authenticated");

  const isCreate = !dateData.id;
  const res = await fetch("/api/my-dates", {
    method: isCreate ? "POST" : "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(userId) },
    body: JSON.stringify(dateData),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка збереження");
}

/**
 * Delete a single date.
 */
export async function deleteMyDate(id: string): Promise<void> {
  const userId = getTelegramUserId();
  if (!userId) throw new Error("Not authenticated");

  const res = await fetch(`/api/my-dates?id=${id}`, {
    method: "DELETE",
    headers: authHeaders(userId),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка видалення");
}

/**
 * Delete multiple dates.
 */
export async function deleteMyDates(ids: string[]): Promise<void> {
  const userId = getTelegramUserId();
  if (!userId) throw new Error("Not authenticated");

  const res = await fetch(`/api/my-dates?ids=${ids.join(",")}`, {
    method: "DELETE",
    headers: authHeaders(userId),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка видалення");
}

/**
 * Fetch available analysis systems.
 */
export async function fetchSystems(): Promise<SystemCard[]> {
  const res = await fetch("/api/mydate/systems");
  const data = await res.json();
  return data?.ok ? data.systems : [];
}

/**
 * Analyze a single date with a specific system.
 */
export async function analyzeDate(
  date: string,
  systemId: string,
): Promise<SystemResult> {
  const res = await fetch("/api/mydate/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, systemId }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error ?? "Помилка аналізу");
  return data.result;
}

/**
 * Fetch analysis for a specific date (all systems).
 */
export async function fetchAnalysis(
  date: string,
): Promise<Record<string, SystemResult>> {
  const res = await fetch(`/api/mydate/analysis/${date}`);
  const data = await res.json();
  return data?.ok ? data.systems : {};
}

/**
 * Compare multiple dates across systems.
 */
export async function compareDates(
  dates: string[],
  systemIds?: string[],
  parameterKeys?: string[],
): Promise<Record<string, Record<string, Record<string, string>>>> {
  const res = await fetch("/api/mydate/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dates, systemIds, parameterKeys }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error ?? "Помилка співставлення");
  return data.matrix;
}
