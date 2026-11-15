/**
 * Клієнт «Стола»: п'ять адрес під `/api/admin/desk/*` під cookie-сесією.
 * Файли — єдиний виняток із `apiFetch` (multipart), і на їх кількість немає
 * стелі ні тут, ні на сервері.
 *
 * @module web-admin-dev/src/pages/desk/desk.api
 */

import type { DeskEntry, DeskFile, DeskThread } from "@wwwuabot/shared/desk/model";
import { apiFetch } from "../../shared/api/client";

export interface DeskThreadsResponse {
  ok: boolean;
  threads: DeskThread[];
  counts: Record<string, number>;
  total: number;
}

export interface DeskRoomResponse {
  ok: boolean;
  thread: DeskThread;
  entries: DeskEntry[];
  files: DeskFile[];
}

export interface DeskThreadsQuery {
  group?: string;
  status?: string;
  turn?: string;
  q?: string;
}

type Param = string | number | null | undefined;

/** Порожні параметри не потрапляють в адресу: `?group=` читався б як вибір. */
function withQuery(path: string, params: Readonly<Record<string, Param>>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}

export function fetchDeskThreads(query: DeskThreadsQuery = {}): Promise<DeskThreadsResponse> {
  return apiFetch<DeskThreadsResponse>(withQuery("/api/admin/desk/threads", { ...query }));
}

export function fetchDeskThread(id: number): Promise<DeskRoomResponse> {
  return apiFetch<DeskRoomResponse>(withQuery("/api/admin/desk/thread", { id }));
}

/** Тема без `id` — нова; з `id` — правка (статус, хід, теги, архів). */
export function saveDeskThread(input: Record<string, unknown>): Promise<DeskRoomResponse> {
  return apiFetch<DeskRoomResponse>("/api/admin/desk/thread", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function addDeskEntry(input: Record<string, unknown>): Promise<DeskRoomResponse> {
  return apiFetch<DeskRoomResponse>("/api/admin/desk/entry", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteDeskEntry(id: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(withQuery("/api/admin/desk/entry", { id }), {
    method: "DELETE",
  });
}

export function deleteDeskFile(id: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(withQuery("/api/admin/desk/file", { id }), {
    method: "DELETE",
  });
}

/** Позначити вичитаним; сервер тримає `max`, тож повтор не відмотує позначку. */
export function markDeskRead(threadId: number, lastSeenEntryId: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/admin/desk/read", {
    method: "POST",
    body: JSON.stringify({ thread_id: threadId, last_seen_entry_id: lastSeenEntryId }),
  });
}

/** Байти файлу — адресою: посилання й `<img>` ходять під тією ж сесією. */
export function deskFileUrl(id: number): string {
  return `/api/admin/desk/file?id=${id}`;
}

/** Завантаження: `thread`, необов'язковий `entry`, `file` — по одному на запит. */
export async function uploadDeskFile(
  threadId: number,
  entryId: number | null,
  file: File,
): Promise<DeskFile> {
  const form = new FormData();
  form.set("thread", String(threadId));
  if (entryId !== null) form.set("entry", String(entryId));
  form.set("file", file);

  const response = await fetch("/api/admin/desk/file", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  const data = (await response.json().catch(() => ({}))) as { file?: DeskFile; error?: string };
  if (!response.ok || !data.file) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data.file;
}
