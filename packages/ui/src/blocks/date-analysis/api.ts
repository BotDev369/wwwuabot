/**
 * Клієнт ендпоинтів `/api/mydate/*` — один на всі блоки: копія `fetchSystems`
 * у другому блоці розійшлася б із цією першою ж правкою відповіді сервера.
 *
 * @module packages/ui/src/blocks/date-analysis/api
 */

import { telegramAuthHeaders } from "@wwwuabot/shared/security/telegram";
import type { SubjectKind } from "@wwwuabot/shared/content";
import type { QualityClaim } from "@wwwuabot/shared/qualities";
import type { MyDate, MyDateSystem } from "@wwwuabot/shared/types/mydate";

/** Система аналізу з реєстру: параметри можуть бути відсутні (система без них). */
export type AnalysisSystem = Omit<MyDateSystem, "parameters"> & {
  parameters?: MyDateSystem["parameters"];
};

/**
 * Досьє одного суб'єкта: те, що сервер знає про дату. Домени, рівні й якорі
 * добирає екран із ядра — сервер віддає лише свідчення.
 */
export interface DossierRead {
  date: string;
  kind: SubjectKind;
  /** Символічний знак дати; `null` — калькулятор його не дав. */
  symbol: string | null;
  claims: QualityClaim[];
  /** Чому якостей немає: подія в ядрі ще не описана. */
  note: "event-not-modelled" | "symbol-missing" | null;
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

/**
 * Досьє за датами: один запит на екран, скільки б суб'єктів не було. Вид їде
 * переліком (`person,event`) — словник у кожного суб'єкта свій.
 */
export async function fetchDossiers(
  dates: string[],
  kind: string | undefined,
  lenses: readonly string[],
): Promise<DossierRead[]> {
  const response = await fetch("/api/mydate/dossier", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
    body: JSON.stringify({ dates, kind, lenses }),
  });
  if (!response.ok) throw await failure(response, "Помилка аналізу");
  const data = await json(response);
  if (!data.ok) throw new Error((data.error as string) ?? "Помилка аналізу");
  return (data.dossiers ?? []) as DossierRead[];
}
