import { apiFetch } from "./client";

export interface ScenarioRow {
  codeword: string;
  rich_message: string | null;
  rich_data: string | null;
  caption_top: string | null;
  caption_mid: string | null;
  caption_bot: string | null;
  photo_url: string | null;
  buttons: string | null;
  updated_at: string;
}

export async function readScenario(codeword: string): Promise<ScenarioRow | null> {
  const res = await apiFetch<{ success: boolean; data: ScenarioRow | null }>(
    "/api/scenarios/read",
    { method: "POST", body: JSON.stringify({ codeword }) }
  );
  return res.data;
}

export async function writeScenario(
  codeword: string,
  richData: string,
  richMessage: boolean
): Promise<void> {
  await apiFetch("/api/scenarios/write", {
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

  const response = await fetch("/api/scenarios/list", {
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

// Збереження довільних полів сценарію (форма). write = UPSERT, тож
// ненадані поля (напр. rich_data) лишаються недоторканими.
export async function saveScenarioFields(
  codeword: string,
  fields: Record<string, unknown>
): Promise<void> {
  await apiFetch("/api/scenarios/write", {
    method: "POST",
    body: JSON.stringify({ codeword, ...fields }),
  });
}

export async function deleteScenario(codeword: string): Promise<{ deleted: boolean }> {
  const res = await apiFetch<{ success: boolean; deleted: boolean }>(
    "/api/scenarios/delete",
    { method: "POST", body: JSON.stringify({ codeword }) }
  );
  return { deleted: res.deleted };
}