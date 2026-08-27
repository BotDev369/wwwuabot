import { apiFetch } from "./client";

export interface UserRow {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  language: string | null;
  created_at: string | null;
  is_blocked: number | null;
  [key: string]: unknown;
}

export async function listUsers(): Promise<UserRow[]> {
  const res = await apiFetch<{ success: boolean; items: UserRow[] }>("/api/users/list");
  return res.items ?? [];
}

export async function readUser(userId: number): Promise<UserRow | null> {
  const res = await apiFetch<{ success: boolean; data: UserRow | null }>("/api/users/read", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  return res.data;
}

export async function updateUser(userId: number, fields: Record<string, unknown>): Promise<void> {
  await apiFetch("/api/users/update", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, ...fields }),
  });
}

export async function deleteUser(userId: number): Promise<boolean> {
  const res = await apiFetch<{ success: boolean; deleted: boolean }>("/api/users/delete", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  return res.deleted;
}

export async function blockUser(userId: number, blocked: boolean): Promise<void> {
  await apiFetch("/api/users/block", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, blocked }),
  });
}

export async function bulkAction(
  action: "delete" | "block" | "unblock",
  ids: number[],
): Promise<number> {
  const res = await apiFetch<{ success: boolean; processed: number }>("/api/users/bulk", {
    method: "POST",
    body: JSON.stringify({ action, ids }),
  });
  return res.processed;
}

export async function sendMessage(userId: number, text: string): Promise<void> {
  await apiFetch("/api/users/message", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, text }),
  });
}
