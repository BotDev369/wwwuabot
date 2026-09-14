import { apiFetch } from "./client";

export interface AdminSession {
  authenticated: boolean;
  /** Коли спливає сесія (мс від епохи); `null` — невідомо або не авторизовано. */
  expiresAt: number | null;
}

export async function login(password: string): Promise<void> {
  await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

/** Стан сесії панелі разом із терміном дії — для екрана профілю. */
export async function fetchAdminSession(): Promise<AdminSession> {
  const res = await apiFetch<{ authenticated: boolean; expiresAt?: number | null }>("/auth/check");
  return { authenticated: res.authenticated, expiresAt: res.expiresAt ?? null };
}

export async function checkAuth(): Promise<boolean> {
  const session = await fetchAdminSession();
  return session.authenticated;
}
