import { apiFetch } from "./client";

/** Тип таблиці сценаріїв. */
export type ScenarioTable = "admin" | "portal";

/** Префікс API-маршруту для кожної таблиці. */
const API_PREFIX: Record<ScenarioTable, string> = {
  admin: "/api/admin/scenarios",
  portal: "/api/portal/scenarios",
};

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

export async function readScenario(
  codeword: string,
  table: ScenarioTable = "admin",
): Promise<ScenarioRow | null> {
  const prefix = API_PREFIX[table];
  const res = await apiFetch<{ success: boolean; data: ScenarioRow | null }>(
    `${prefix}/read`,
    { method: "POST", body: JSON.stringify({ codeword }) },
  );
  return res.data;
}

export async function writeScenario(
  codeword: string,
  richData: string,
  richMessage: boolean,
  table: ScenarioTable = "admin",
): Promise<void> {
  const prefix = API_PREFIX[table];
  await apiFetch(`${prefix}/write`, {
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

export async function listScenarios(
  etag: string | null,
  table: ScenarioTable = "admin",
): Promise<ListScenariosResult> {
  const prefix = API_PREFIX[table];
  const headers: Record<string, string> = {};
  if (etag) headers["If-None-Match"] = etag;

  const response = await fetch(`${prefix}/list`, {
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
  table: ScenarioTable = "admin",
): Promise<void> {
  const prefix = API_PREFIX[table];
  await apiFetch(`${prefix}/write`, {
    method: "POST",
    body: JSON.stringify({ codeword, ...fields }),
  });
}

export async function readScenarioAll(
  codeword: string,
  table: ScenarioTable = "admin",
): Promise<Record<string, unknown> | null> {
  const prefix = API_PREFIX[table];
  const res = await apiFetch<{ success: boolean; data: Record<string, unknown> | null }>(
    `${prefix}/read-all`,
    { method: "POST", body: JSON.stringify({ codeword }) },
  );
  return res.data;
}

export async function updateScenarioFields(
  codeword: string,
  fields: Record<string, unknown>,
  table: ScenarioTable = "admin",
): Promise<{ updated_at?: string }> {
  const prefix = API_PREFIX[table];
  const res = await apiFetch<{ success: boolean; updated_at?: string }>(`${prefix}/update`, {
    method: "POST",
    body: JSON.stringify({ codeword, ...fields }),
  });
  return { updated_at: res.updated_at };
}

export async function deleteScenario(
  codeword: string,
  table: ScenarioTable = "admin",
): Promise<{ deleted: boolean }> {
  const prefix = API_PREFIX[table];
  const res = await apiFetch<{ success: boolean; deleted: boolean }>(`${prefix}/delete`, {
    method: "POST",
    body: JSON.stringify({ codeword }),
  });
  return { deleted: res.deleted };
}
