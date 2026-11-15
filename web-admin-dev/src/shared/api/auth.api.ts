import { apiFetch } from "./client";

export type SessionSide = "serhii" | "buffy";

export interface AdminSession {
  authenticated: boolean;
  /** Чий це вхід: `buffy` бачить лише стіл, `serhii` — усю панель. */
  side: SessionSide | null;
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
  const res = await apiFetch<{
    authenticated: boolean;
    side?: SessionSide | null;
    expiresAt?: number | null;
  }>("/auth/check");
  return {
    authenticated: res.authenticated,
    side: res.side ?? null,
    expiresAt: res.expiresAt ?? null,
  };
}

/** Чий вхід — або `null`, якщо сесії немає. */
export async function checkAuth(): Promise<SessionSide | null> {
  const session = await fetchAdminSession();
  return session.authenticated ? (session.side ?? "serhii") : null;
}
