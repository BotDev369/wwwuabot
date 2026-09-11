import { describe, it, expect } from "vitest";
import { resolveUserId, tryResolveUserId } from "./identity";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

/**
 * Фікстура підписаного initData.
 *
 * Свідомо дублює однойменну фікстуру з
 * `packages/shared/src/security/telegram.test.ts`: публічний API пакета
 * не має містити тестових хелперів, а тестовий код між пакетами — це
 * менше зло, ніж розширення `exports`.
 */
async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function makeInitData(userId: number, botToken = BOT_TOKEN): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
  });
  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), botToken);
  params.set("hash", toHex(await hmac(secret, checkString)));
  return params.toString();
}

function request(headers: Record<string, string> = {}): Request {
  return new Request("https://api.example.com/api/sites", {
    headers: new Headers(headers),
  });
}

const env = { BOT_TOKEN };

describe("resolveUserId", () => {
  it("приймає коректно підписаний initData", async () => {
    const req = request({ "X-Telegram-Init-Data": await makeInitData(42) });
    const result = await resolveUserId(req, env);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.userId).toBe(42);
  });

  it("⛔ НЕ приймає голий X-Telegram-User-Id (регресія: дірка з §5.3в)", async () => {
    const req = request({ "X-Telegram-User-Id": "42" });
    const result = await resolveUserId(req, env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("⛔ НЕ приймає cookie user_id (регресія: дірка з §5.3а)", async () => {
    const req = request({ Cookie: "user_id=42" });
    const result = await resolveUserId(req, env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("відхиляє запит без ідентичності", async () => {
    const result = await resolveUserId(request(), env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("відхиляє initData зі стороннім підписом", async () => {
    const req = request({
      "X-Telegram-Init-Data": await makeInitData(42, "999:ІНШИЙ-ТОКЕН"),
    });
    const result = await resolveUserId(req, env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("відхиляє сміттєвий initData", async () => {
    // Реальний initData завжди percent-encoded, тобто ASCII.
    const req = request({ "X-Telegram-Init-Data": "not-even-params" });
    const result = await resolveUserId(req, env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("повертає 503, якщо BOT_TOKEN не налаштований", async () => {
    const req = request({ "X-Telegram-Init-Data": await makeInitData(42) });
    const result = await resolveUserId(req, {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });
});

describe("tryResolveUserId", () => {
  it("повертає user_id для валідного initData", async () => {
    const req = request({ "X-Telegram-Init-Data": await makeInitData(7) });
    await expect(tryResolveUserId(req, env)).resolves.toBe(7);
  });

  it("повертає null замість помилки, коли ідентичності немає", async () => {
    await expect(tryResolveUserId(request(), env)).resolves.toBeNull();
  });

  it("повертає null, якщо BOT_TOKEN не налаштований", async () => {
    const req = request({ "X-Telegram-Init-Data": await makeInitData(7) });
    await expect(tryResolveUserId(req, {})).resolves.toBeNull();
  });
});
