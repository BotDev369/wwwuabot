/**
 * Шлюз файлів магазину: **відмови й байти**.
 *
 * Перевіряємо те, що ламається мовчки: чужий магазин не показує файлів, відмови
 * сервісу доходять до клієнта своїм кодом, а сам файл віддається з типом, ETag
 * і `immutable` (ключ не змінюється ніколи).
 *
 * @module api-dev/src/controllers/shop-media.controller.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const resolveUserId = vi.fn();
const listOwn = vi.fn();
const upload = vi.fn();
const remove = vi.fn();
const read = vi.fn();

vi.mock("../shared/identity", () => ({
  resolveUserId: (request: Request, env: Env) => resolveUserId(request, env),
}));
vi.mock("../services/shop/media.service", () => ({
  ShopMediaService: class {
    listOwn = listOwn;
    upload = upload;
    remove = remove;
    read = read;
  },
}));

const { handleUserShopMedia, handleShopMediaFile } = await import("./shop-media.controller");

const ENV = {} as Env;
const ME = 777;
const MEDIA = { id: 3, shopId: 5, key: "shop/5/abc-photo.png", mime: "image/png", bytes: 10 };

function asUser(result: unknown = { ok: true, userId: ME }): void {
  resolveUserId.mockResolvedValue(result);
}

function request(method: string, query = "?shop=5"): Request {
  return new Request(`https://api.test/api/user/shop/media${query}`, { method });
}

function uploadForm(patch: Record<string, unknown> = {}): Request {
  const form = new FormData();
  form.set("shop", "5");
  form.set("file", new File([new Uint8Array(8)], "photo.png", { type: "image/png" }));
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) form.delete(key);
    else form.set(key, value as string);
  }
  return new Request("https://api.test/api/user/shop/media", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  asUser();
});

describe("власна бібліотека", () => {
  it("віддає файли свого магазину", async () => {
    listOwn.mockResolvedValue([MEDIA]);

    const response = await handleUserShopMedia(request("GET"), ENV);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, media: [MEDIA] });
    expect(listOwn).toHaveBeenCalledWith(5, ME);
  });

  it("чужий магазин не відрізняється від неіснуючого (404)", async () => {
    listOwn.mockResolvedValue(null);

    expect((await handleUserShopMedia(request("GET"), ENV)).status).toBe(404);
  });

  it("без номера магазину — 400, і в сервіс не ходить", async () => {
    expect((await handleUserShopMedia(request("GET", ""), ENV)).status).toBe(400);
    expect(listOwn).not.toHaveBeenCalled();
  });

  it("прибирає файл за номером", async () => {
    remove.mockResolvedValue(true);

    const response = await handleUserShopMedia(request("DELETE", "?shop=5&id=3"), ENV);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, id: 3 });
    expect(remove).toHaveBeenCalledWith(5, ME, 3);
  });

  it("не прибирає того, чого не знайшов", async () => {
    remove.mockResolvedValue(false);

    expect((await handleUserShopMedia(request("DELETE", "?shop=5&id=3"), ENV)).status).toBe(404);
  });

  it("не приймає прибирання без номера файлу", async () => {
    expect((await handleUserShopMedia(request("DELETE"), ENV)).status).toBe(400);
    expect(remove).not.toHaveBeenCalled();
  });

  it("не приймає метод, який не є GET, POST чи DELETE", async () => {
    expect((await handleUserShopMedia(request("PUT"), ENV)).status).toBe(405);
  });

  it("не шукає файлів, якщо людину не впізнано", async () => {
    asUser({ ok: false, response: new Response("{}", { status: 401 }) });

    expect((await handleUserShopMedia(request("GET"), ENV)).status).toBe(401);
    expect(listOwn).not.toHaveBeenCalled();
  });

  it("помилку бази не випускає назовні — людині 500", async () => {
    listOwn.mockRejectedValue(new Error("D1 down"));

    expect((await handleUserShopMedia(request("GET"), ENV)).status).toBe(500);
  });
});

describe("завантаження", () => {
  it("віддає рядок обліку, а не адресу", async () => {
    upload.mockResolvedValue({ kind: "saved", media: MEDIA });

    const response = await handleUserShopMedia(uploadForm(), ENV);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, media: MEDIA });
    expect(upload).toHaveBeenCalledWith(5, ME, expect.any(File));
  });

  it("каже, що сховище не налаштоване, а не «помилка» (503)", async () => {
    upload.mockResolvedValue({ kind: "unavailable" });

    expect((await handleUserShopMedia(uploadForm(), ENV)).status).toBe(503);
  });

  it("віддає причину відмови сервісу, а не свою", async () => {
    upload.mockResolvedValue({ kind: "rejected", message: "Файл завеликий" });

    const response = await handleUserShopMedia(uploadForm(), ENV);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Файл завеликий" });
  });

  it("чужий магазин — 404", async () => {
    upload.mockResolvedValue({ kind: "not_found" });

    expect((await handleUserShopMedia(uploadForm(), ENV)).status).toBe(404);
  });

  it("не приймає форму без магазину, без файлу й порожній файл", async () => {
    expect((await handleUserShopMedia(uploadForm({ shop: null }), ENV)).status).toBe(400);
    expect((await handleUserShopMedia(uploadForm({ file: null }), ENV)).status).toBe(400);
    expect(
      (await handleUserShopMedia(uploadForm({ file: new File([], "empty.png") }), ENV)).status,
    ).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it("не приймає тіло, яке не є формою", async () => {
    const notForm = new Request("https://api.test/api/user/shop/media", {
      method: "POST",
      body: "не форма",
      headers: { "Content-Type": "application/json" },
    });

    expect((await handleUserShopMedia(notForm, ENV)).status).toBe(400);
  });
});

describe("віддання файлу", () => {
  it("віддає байти з типом, ETag і immutable", async () => {
    read.mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      httpEtag: '"e-1"',
      writeHttpMetadata: (headers: Headers) => headers.set("Content-Type", "image/png"),
    });

    const response = await handleShopMediaFile(ENV, MEDIA.key);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("ETag")).toBe('"e-1"');
    expect(response.headers.get("Cache-Control")).toContain("immutable");
  });

  it("без метаданих віддає загальний тип, а не порожній", async () => {
    read.mockResolvedValue({
      body: new Uint8Array([1]),
      httpEtag: '"e"',
      writeHttpMetadata: () => {},
    });

    expect((await handleShopMediaFile(ENV, MEDIA.key)).headers.get("Content-Type")).toBe(
      "application/octet-stream",
    );
  });

  it("неіснуючий файл — 404, і це не помилка", async () => {
    read.mockResolvedValue(null);

    expect((await handleShopMediaFile(ENV, "shop/9/nope.png")).status).toBe(404);
  });

  it("помилку читання не випускає назовні", async () => {
    read.mockRejectedValue(new Error("R2 down"));

    expect((await handleShopMediaFile(ENV, MEDIA.key)).status).toBe(500);
  });
});
