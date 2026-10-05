/**
 * Клієнт ендпоинтів аналізу `/api/mydate/*` — один на всі блоки.
 * Три блоки мали власні копії `fetchSystems`/`SystemCard`, а `formatDate`/
 * `isValidDate` вже жили в `@wwwuabot/shared/utils/mydate-helpers`: копії
 * розійшлися б першою ж правкою відповіді сервера.
 * @module packages/ui/src/blocks/mydate/api
 */

import { telegramAuthHeaders } from "@wwwuabot/shared/security/telegram";
import type { MyDateSystem } from "@wwwuabot/shared/types/mydate";

/** Система аналізу з реєстру: параметри можуть бути відсутні (система без них). */
export type AnalysisSystem = Omit<MyDateSystem, "parameters"> & {
  parameters?: MyDateSystem["parameters"];
};

/** Результат аналізу однієї системи — значення приходять уже рядками. */
export interface SystemResult {
  parameters: { key: string; label: string; value: string }[];
  comingSoon: string[];
}

/** Матриця порівняння: `matrix[date][systemId][parameterKey]`. */
export type CompareMatrix = Record<string, Record<string, Record<string, string>>>;

function json(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
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
): Promise<CompareMatrix> {
  const data = await json(
    await fetch("/api/mydate/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
      body: JSON.stringify({ dates, systemIds, parameterKeys }),
    }),
  );
  if (!data.ok) throw new Error((data.error as string) ?? "Помилка співставлення");
  return data.matrix as CompareMatrix;
}
