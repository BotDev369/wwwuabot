import { apiFetch } from "./client";

/**
 * API сценаріїв — єдина таблиця `scenarios`.
 *
 * Рядок має дві назви: номер (`id`) і адресу (`slug`). Для читання й видалення
 * годяться обидві, для оновлення потрібен **номер** — інакше перейменування
 * неможливе (див. `api-dev/src/shared/scenarios-address.ts`).
 */
const PREFIX = "/api/portal/scenarios";

/** Посилання на рядок: номер, а якщо його немає — адреса. */
export interface ScenarioRef {
  id?: number | null;
  slug: string;
}

export interface ScenarioRow {
  id: number;
  slug: string;
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

export async function readScenario(slug: string): Promise<ScenarioRow | null> {
  const res = await apiFetch<{ success: boolean; data: ScenarioRow | null }>(`${PREFIX}/read`, {
    method: "POST",
    body: JSON.stringify({ slug }),
  });
  return res.data;
}

export async function writeScenario(
  slug: string,
  richData: string,
  richMessage: boolean,
): Promise<void> {
  await apiFetch(`${PREFIX}/write`, {
    method: "POST",
    body: JSON.stringify({
      slug,
      rich_data: richData,
      rich_message: richMessage ? "true" : "false",
    }),
  });
}

export interface ScenarioListRow {
  slug: string;
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
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const newEtag = response.headers.get("ETag");
  const body = (await response.json()) as { success: boolean; items: ScenarioListRow[] };
  return { notModified: false, items: body.items ?? [], etag: newEtag };
}

export async function saveScenarioFields(
  slug: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await apiFetch(`${PREFIX}/write`, {
    method: "POST",
    body: JSON.stringify({ slug, ...fields }),
  });
}

export async function readScenarioAll(slug: string): Promise<Record<string, unknown> | null> {
  const res = await apiFetch<{ success: boolean; data: Record<string, unknown> | null }>(
    `${PREFIX}/read-all`,
    { method: "POST", body: JSON.stringify({ slug }) },
  );
  return res.data;
}

export interface UpdateScenarioResult {
  id: number | null;
  slug: string | null;
  updated_at?: string;
}

/**
 * Оновлює рядок за номером.
 *
 * `fields.slug`, якщо передано, — **нову** адресу: саме так рядок
 * перейменовують. `ref.slug` потрібен лише як адреса за замовчуванням.
 */
export async function updateScenarioFields(
  ref: ScenarioRef,
  fields: Record<string, unknown>,
): Promise<UpdateScenarioResult> {
  const res = await apiFetch<{
    success: boolean;
    id?: number | null;
    slug?: string | null;
    updated_at?: string;
  }>(`${PREFIX}/update`, {
    method: "POST",
    body: JSON.stringify({ id: ref.id ?? undefined, slug: ref.slug, ...fields }),
  });
  return { id: res.id ?? null, slug: res.slug ?? null, updated_at: res.updated_at };
}

export async function deleteScenario(ref: ScenarioRef): Promise<{ deleted: boolean }> {
  const res = await apiFetch<{ success: boolean; deleted: boolean }>(`${PREFIX}/delete`, {
    method: "POST",
    body: JSON.stringify({ id: ref.id ?? undefined, slug: ref.slug }),
  });
  return { deleted: res.deleted };
}
