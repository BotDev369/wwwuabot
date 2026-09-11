import { describe, it, expect } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  buildClearedSessionCookie,
  buildSessionCookie,
  hasValidSession,
  parseCookies,
  sessionExpiresAt,
  signSessionToken,
  verifySessionToken,
} from "./session";

const SECRET = "test-admin-secret";

function requestWithCookie(cookie: string | null): Request {
  const headers = new Headers();
  if (cookie !== null) headers.set("Cookie", cookie);
  return new Request("https://example.com/api/admin/scenarios/list", { headers });
}

describe("parseCookies", () => {
  it("повертає порожній об'єкт без заголовка", () => {
    expect(parseCookies(null)).toEqual({});
    expect(parseCookies("")).toEqual({});
  });

  it("розбирає кілька cookie", () => {
    expect(parseCookies("a=1; b=2; c=3")).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("зберігає значення з символом '='", () => {
    expect(parseCookies("token=abc.def=")).toEqual({ token: "abc.def=" });
  });

  it("терпить зайві пробіли", () => {
    expect(parseCookies("  a = 1 ;  b=2 ")).toEqual({ a: "1", b: "2" });
  });
});

describe("signSessionToken / verifySessionToken", () => {
  it("валідний токен проходить перевірку", async () => {
    const token = await signSessionToken(`admin:${sessionExpiresAt()}`, SECRET);
    await expect(verifySessionToken(token, SECRET)).resolves.toBe(true);
  });

  it("токен з іншим секретом не проходить", async () => {
    const token = await signSessionToken(`admin:${sessionExpiresAt()}`, SECRET);
    await expect(verifySessionToken(token, "інший-секрет")).resolves.toBe(false);
  });

  it("прострочений токен не проходить", async () => {
    const token = await signSessionToken(`admin:${Date.now() - 1000}`, SECRET);
    await expect(verifySessionToken(token, SECRET)).resolves.toBe(false);
  });

  it("підроблений payload не проходить (підпис розходиться)", async () => {
    const token = await signSessionToken(`admin:${sessionExpiresAt()}`, SECRET);
    const [payload, sig] = token.split(".");
    const forged = `superadmin:${payload.split(":")[1]}.${sig}`;
    await expect(verifySessionToken(forged, SECRET)).resolves.toBe(false);
  });

  it("підмінений термін дії не проходить", async () => {
    const token = await signSessionToken(`admin:${Date.now() - 1000}`, SECRET);
    const [payload, sig] = token.split(".");
    const extended = `${payload.split(":")[0]}:${Date.now() + 1_000_000}.${sig}`;
    await expect(verifySessionToken(extended, SECRET)).resolves.toBe(false);
  });

  it("токен без розділювача не проходить", async () => {
    await expect(verifySessionToken("сміття", SECRET)).resolves.toBe(false);
  });

  it("не-hex підпис не проходить", async () => {
    await expect(verifySessionToken("admin:1.zzzz", SECRET)).resolves.toBe(false);
  });

  it("нечисловий термін дії не проходить", async () => {
    const token = await signSessionToken("admin:soon", SECRET);
    await expect(verifySessionToken(token, SECRET)).resolves.toBe(false);
  });
});

describe("hasValidSession", () => {
  it("без cookie — false", async () => {
    await expect(hasValidSession(requestWithCookie(null), SECRET)).resolves.toBe(false);
  });

  it("без секрету — false (навіть із валідним токеном)", async () => {
    const token = await signSessionToken(`admin:${sessionExpiresAt()}`, SECRET);
    await expect(
      hasValidSession(requestWithCookie(`${ADMIN_COOKIE_NAME}=${token}`), undefined),
    ).resolves.toBe(false);
  });

  it("із валідним токеном — true", async () => {
    const token = await signSessionToken(`admin:${sessionExpiresAt()}`, SECRET);
    await expect(
      hasValidSession(requestWithCookie(`${ADMIN_COOKIE_NAME}=${token}`), SECRET),
    ).resolves.toBe(true);
  });

  it("cookie з чужим ім'ям ігнорується", async () => {
    const token = await signSessionToken(`admin:${sessionExpiresAt()}`, SECRET);
    await expect(
      hasValidSession(requestWithCookie(`other_session=${token}`), SECRET),
    ).resolves.toBe(false);
  });
});

describe("cookie-заголовки", () => {
  it("сесійна cookie має захисні прапорці", () => {
    const cookie = buildSessionCookie("payload.sig");
    expect(cookie).toContain(`${ADMIN_COOKIE_NAME}=payload.sig`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Max-Age=28800");
  });

  it("очищувальна cookie знищує сесію", () => {
    const cookie = buildClearedSessionCookie();
    expect(cookie).toContain(`${ADMIN_COOKIE_NAME}=;`);
    expect(cookie).toContain("Max-Age=0");
  });
});
