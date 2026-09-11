import { describe, it, expect } from "vitest";
import { verifyInitData, INIT_DATA_MAX_AGE_SECONDS } from "./telegram";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

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

/**
 * Будує підписаний initData тим самим алгоритмом, що й Telegram.
 * Це регресійний тест: він фіксує контракт, а не доводить коректність
 * алгоритму (для цього потрібен офіційний тест-вектор Telegram).
 */
async function makeInitData(
  fields: Record<string, string>,
  botToken = BOT_TOKEN,
): Promise<string> {
  const params = new URLSearchParams(fields);
  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), botToken);
  params.set("hash", toHex(await hmac(secret, checkString)));
  return params.toString();
}

function validFields(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "AAExample",
    user: JSON.stringify({ id: 777, first_name: "Тест" }),
    ...overrides,
  };
}

describe("verifyInitData", () => {
  it("приймає коректно підписаний initData і повертає user_id", async () => {
    const initData = await makeInitData(validFields());
    await expect(verifyInitData(initData, BOT_TOKEN)).resolves.toBe(777);
  });

  it("відхиляє initData з іншим bot-токеном", async () => {
    const initData = await makeInitData(validFields(), "999:ІНШИЙ-ТОКЕН");
    await expect(verifyInitData(initData, BOT_TOKEN)).resolves.toBeNull();
  });

  it("відхиляє initData без hash", async () => {
    const params = new URLSearchParams(validFields());
    await expect(verifyInitData(params.toString(), BOT_TOKEN)).resolves.toBeNull();
  });

  it("відхиляє прострочений initData", async () => {
    const old = Math.floor(Date.now() / 1000) - INIT_DATA_MAX_AGE_SECONDS - 60;
    const initData = await makeInitData(validFields({ auth_date: String(old) }));
    await expect(verifyInitData(initData, BOT_TOKEN)).resolves.toBeNull();
  });

  it("відхиляє підмінений user_id (підпис розходиться)", async () => {
    const initData = await makeInitData(validFields());
    const params = new URLSearchParams(initData);
    params.set("user", JSON.stringify({ id: 1, first_name: "Тест" }));
    await expect(verifyInitData(params.toString(), BOT_TOKEN)).resolves.toBeNull();
  });

  it("відхиляє підмінений auth_date", async () => {
    const initData = await makeInitData(validFields());
    const params = new URLSearchParams(initData);
    params.set("auth_date", String(Math.floor(Date.now() / 1000) + 9999));
    await expect(verifyInitData(params.toString(), BOT_TOKEN)).resolves.toBeNull();
  });

  it("відхиляє нечисловий auth_date", async () => {
    const initData = await makeInitData(validFields({ auth_date: "не-число" }));
    await expect(verifyInitData(initData, BOT_TOKEN)).resolves.toBeNull();
  });

  it("відхиляє зіпсований JSON у user", async () => {
    const initData = await makeInitData(validFields({ user: "{не json" }));
    await expect(verifyInitData(initData, BOT_TOKEN)).resolves.toBeNull();
  });

  it("відхиляє порожній initData або порожній токен", async () => {
    await expect(verifyInitData("", BOT_TOKEN)).resolves.toBeNull();
    const initData = await makeInitData(validFields());
    await expect(verifyInitData(initData, "")).resolves.toBeNull();
  });

  it("не кидає виняток на смітті", async () => {
    await expect(verifyInitData("!!!!", BOT_TOKEN)).resolves.toBeNull();
  });
});
