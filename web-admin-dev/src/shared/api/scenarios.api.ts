import { apiFetch } from "./client";

/**
 * API сценаріїв — **одна таблиця** `scenarios` (маршрут `/api/portal/scenarios`).
 *
 * Доти тут був словник `API_PREFIX: Record<ScenarioTable, string>` і `table`
 * у кожній функції: адмінка мала дві вкладки й дві таблиці (`scenarios` і
 * `scenarios-admin`). Адмін-копію видалено 13.09.2026 — її не читав ніхто поза
 * адмінкою, — тож зникли і тип `ScenarioTable`, і параметр `table`: префікс один.
 */
const PREFIX = "/api/portal/scenarios";

export interface ScenarioRow {
  codeword: string;
  title: string | null;
  rich_message: string | null;
  rich_data: string | null;
  caption_top: string | null;
  caption_mid: string | null;
  caption_bot: string | null;
  photo_url: string | null;
  buttons: string | null;
  page_data: string | null;
  updated_at: string;
}

export async function readScenario(codeword: string): Promise<ScenarioRow | null> {
  const res = await apiFetch<{ success: boolean; data: ScenarioRow | null }>(`${PREFIX}/read`, {
    method: "POST",
    body: JSON.stringify({ codeword }),
  });
  return res.data;
}

export async function writeScenario(
  codeword: string,
  richData: string,
  richMessage: boolean,
): Promise<void> {
  await apiFetch(`${PREFIX}/write`, {
    method: "POST",
    body: JSON.stringify({
      codeword,
      rich_data: richData,
      rich_message: richMessage ? "true" : "false",
    }),
  });
}

export interface ScenarioListRow {
  codeword: string;
  rich_message: string | null;
  updated_at: string;
  [key: string]: unknown;
}

export interface ListScenariosResult {
  notModified: boolean;
  items: ScenarioListRow[];
  etag: string | null;
}

export async function listScenarios(etag: string | null): Promise<ListScenariosResult> {
  const headers: Record<string, string> = {};
  if (etag) headers["If-None-Match"] = etag;

  const response = await fetch(`${PREFIX}/list`, {
    credentials: "same-origin",
    headers,
  });

  if (response.status === 401) {
    window.location.reload();
    throw new Error("Session expired");
  }
  if (response.status === 304) {
    return { notModified: true, items: [], etag };
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const newEtag = response.headers.get("ETag");
  const body = (await response.json()) as { success: boolean; items: ScenarioListRow[] };
  return { notModified: false, items: body.items ?? [], etag: newEtag };
}

export async function saveScenarioFields(
  codeword: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await apiFetch(`${PREFIX}/write`, {
    method: "POST",
    body: JSON.stringify({ codeword, ...fields }),
  });
}

export async function readScenarioAll(codeword: string): Promise<Record<string, unknown> | null> {
  const res = await apiFetch<{ success: boolean; data: Record<string, unknown> | null }>(
    `${PREFIX}/read-all`,
    { method: "POST", body: JSON.stringify({ codeword }) },
  );
  return res.data;
}

export async function updateScenarioFields(
  codeword: string,
  fields: Record<string, unknown>,
): Promise<{ updated_at?: string }> {
  const res = await apiFetch<{ success: boolean; updated_at?: string }>(`${PREFIX}/update`, {
    method: "POST",
    body: JSON.stringify({ codeword, ...fields }),
  });
  return { updated_at: res.updated_at };
}

export async function deleteScenario(codeword: string): Promise<{ deleted: boolean }> {
  const res = await apiFetch<{ success: boolean; deleted: boolean }>(`${PREFIX}/delete`, {
    method: "POST",
    body: JSON.stringify({ codeword }),
  });
  return { deleted: res.deleted };
}
