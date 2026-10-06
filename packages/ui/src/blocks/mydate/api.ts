/**
 * Клієнт ендпоинтів аналізу `/api/mydate/*` — один на всі блоки.
 * Три блоки мали власні копії `fetchSystems`/`SystemCard`, а `formatDate`/
 * `isValidDate` вже жили в `@wwwuabot/shared/utils/mydate-helpers`: копії
 * розійшлися б першою ж правкою відповіді сервера.
 * @module packages/ui/src/blocks/mydate/api
 */

import { telegramAuthHeaders } from "@wwwuabot/shared/security/telegram";
import type { MyDate, MyDateSystem } from "@wwwuabot/shared/types/mydate";

/** Система аналізу з реєстру: параметри можуть бути відсутні (система без них). */
export type AnalysisSystem = Omit<MyDateSystem, "parameters"> & {
  parameters?: MyDateSystem["parameters"];
};

/**
 * Результат аналізу однієї системи — значення приходять уже рядками.
 * Обидва тексти дописує сервер під час відповіді: `about` — що визначає сам
 * параметр, `meaning` — що означає конкретне значення.
 */
export interface SystemResult {
  parameters: { key: string; label: string; value: string; about?: string; meaning?: string }[];
  comingSoon: string[];
}

/** Матриця порівняння: `matrix[date][systemId][parameterKey]`. */
export type CompareMatrix = Record<string, Record<string, Record<string, string>>>;

/**
 * Тексти під тим самим ключем, що й матриця: `details[date][systemId][key]`.
 * Трактують **значення конкретної дати**, тож живуть поруч із нею, а не в
 * окремому запиті на кожну дату.
 */
export type CompareDetails = Record<
  string,
  Record<string, Record<string, { about?: string; meaning?: string }>>
>;

export interface CompareResult {
  matrix: CompareMatrix;
  details: CompareDetails;
}

function json(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
}

/**
 * Повідомлення з тіла відповіді.
 *
 * `HTTP 403` без тіла — це дефект для людини: вона бачить «Помилка: Error:
 * HTTP 403» і не знає, що робити. Тому спершу читаємо `error` із відповіді, а
 * код статусу лишається лише на випадок, коли тіла немає взагалі.
 */
async function failure(response: Response, fallback: string): Promise<Error> {
  try {
    const data = await json(response);
    const message = data.error;
    return new Error(typeof message === "string" && message ? message : fallback);
  } catch {
    return new Error(`${fallback} (HTTP ${response.status})`);
  }
}

// ── Дати ───────────────────────────────────────────────────────────

export async function fetchMyDates(): Promise<MyDate[]> {
  const response = await fetch("/api/my-dates", { headers: telegramAuthHeaders() });
  if (!response.ok) throw await failure(response, "Помилка завантаження");
  const data = await json(response);
  if (!data.ok) throw new Error((data.error as string) ?? "Помилка завантаження");
  return data.dates as MyDate[];
}

export async function saveMyDate(dateData: Partial<MyDate>): Promise<void> {
  const response = await fetch("/api/my-dates", {
    method: dateData.id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
    body: JSON.stringify(dateData),
  });
  if (!response.ok) throw await failure(response, "Помилка збереження");
  const data = await json(response);
  if (!data.ok) throw new Error((data.error as string) ?? "Помилка збереження");
}

async function remove(query: string, fallback: string): Promise<void> {
  const response = await fetch(`/api/my-dates${query}`, {
    method: "DELETE",
    headers: telegramAuthHeaders(),
  });
  if (!response.ok) throw await failure(response, fallback);
  const data = await json(response);
  if (!data.ok) throw new Error((data.error as string) ?? fallback);
}

export function deleteMyDate(id: string): Promise<void> {
  return remove(`?id=${encodeURIComponent(id)}`, "Помилка видалення");
}

export function deleteMyDates(ids: string[]): Promise<void> {
  return remove(`?ids=${ids.map(encodeURIComponent).join(",")}`, "Помилка видалення");
}

export async function fetchSystems(): Promise<AnalysisSystem[]> {
  const data = await json(await fetch("/api/mydate/systems", { headers: telegramAuthHeaders() }));
  return data.ok ? (data.systems as AnalysisSystem[]) : [];
}

export async function analyzeDate(date: string, systemId: string): Promise<SystemResult> {
  const data = await json(
    await fetch("/api/mydate/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
      body: JSON.stringify({ date, systemId }),
    }),
  );
  if (!data.ok) throw new Error((data.error as string) ?? "Помилка аналізу");
  return data.result as SystemResult;
}

/** Уже збережений аналіз дати; немає результату — порожня мапа, не помилка. */
export async function fetchAnalysis(date: string): Promise<Record<string, SystemResult>> {
  const data = await json(
    await fetch(`/api/mydate/analysis/${date}`, { headers: telegramAuthHeaders() }),
  );
  return data.ok ? (data.systems as Record<string, SystemResult>) : {};
}

export async function compareDates(
  dates: string[],
  systemIds?: string[],
  parameterKeys?: string[],
): Promise<CompareResult> {
  const data = await json(
    await fetch("/api/mydate/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
      body: JSON.stringify({ dates, systemIds, parameterKeys }),
    }),
  );
  if (!data.ok) throw new Error((data.error as string) ?? "Помилка співставлення");
  return {
    matrix: (data.matrix ?? {}) as CompareMatrix,
    details: (data.details ?? {}) as CompareDetails,
  };
}
