/**
 * Шлюз до файлів листування: **відмова й байти**.
 *
 * Перевіряємо дві речі, які ламаються мовчки. Перша — **відмови не витікають**:
 * людині, з ким зв'язку немає, відповідаємо так само, як неіснуючій розмові, а
 * чужий ключ не відрізняємо від вигаданого; інакше сам код відповіді показує,
 * чи є в тебе переписка й чи завантажував хтось файл. Друга — **файл віддається
 * правильно**: з ETag, `immutable` (ключ не змінюється ніколи) і типом із
 * метаданих, а коли метаданих немає — `application/octet-stream`, щоб браузер
 * не вгадував.
 *
 * @module api-dev/src/controllers/message-media.controller.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const resolveUserId = vi.fn();
const uploadMessageMedia = vi.fn();
const readMessageMedia = vi.fn();

vi.mock("../shared/identity", () => ({
  resolveUserId: (request: Request, env: Env) => resolveUserId(request, env),
}));
vi.mock("../services/messages/media", () => ({
  uploadMessageMedia: (...args: unknown[]) => uploadMessageMedia(...args),
  readMessageMedia: (...args: unknown[]) => readMessageMedia(...args),
}));

const { handleMessageMediaFile, handleMessageMediaUpload } =
  await import("./message-media.controller");

const ENV = {} as Env;
const ME = 777;
const PEER = 42;
const KEY = "msg/777/abcdef.png";

/** Підписаний клієнт — контролер сам нічого не повинен про нього знати. */
function asUser(result: unknown = { ok: true, userId: ME }): void {
  resolveUserId.mockResolvedValue(result);
}

function photo(size = 4): File {
  return new File([new Uint8Array(size)], "photo.png", { type: "image/png" });
}

function uploadForm(patch: Record<string, unknown> = {}): Request {
  const form = new FormData();
  form.set("peer", String(PEER));
  form.set("file", photo());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) form.delete(key);
    else form.set(key, value as string);
  }
  return new Request("https://api.test/api/messages/media", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  asUser();
});

describe("завантаження фото", () => {
  it("повертає номер і ключ файлу, якого ще немає в жодному повідомленні", async () => {
    const media = { id: 12, key: KEY, mime: "image/png", bytes: 4 };
    uploadMessageMedia.mockResolvedValue({ kind: "ok", media });

    const response = await handleMessageMediaUpload(uploadForm(), ENV);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, media });
    expect(uploadMessageMedia).toHaveBeenCalledWith(ENV, ME, PEER, expect.any(File));
  });

  it("не називає файл, якого не існує: без зв'язку той самий 404, що й без розмови", async () => {
    uploadMessageMedia.mockResolvedValue({ kind: "no_link" });

    const response = await handleMessageMediaUpload(uploadForm(), ENV);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ ok: false });
  });

  it("каже, що сховище не налаштоване, а не «помилка» (503)", async () => {
    uploadMessageMedia.mockResolvedValue({ kind: "unavailable" });

    expect((await handleMessageMediaUpload(uploadForm(), ENV)).status).toBe(503);
  });

  it("віддає причину відмови сервіру, а не свою", async () => {
    uploadMessageMedia.mockResolvedValue({ kind: "rejected", message: "Файл завеликий" });

    const response = await handleMessageMediaUpload(uploadForm(), ENV);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Файл завеликий" });
  });

  it("не приймає запит без співрозмовника й без файлу", async () => {
    expect((await handleMessageMediaUpload(uploadForm({ peer: null }), ENV)).status).toBe(400);
    expect((await handleMessageMediaUpload(uploadForm({ file: null }), ENV)).status).toBe(400);
    // Незначений `peer` не є номером людини.
    expect((await handleMessageMediaUpload(uploadForm({ peer: "abc" }), ENV)).status).toBe(400);
    expect(uploadMessageMedia).not.toHaveBeenCalled();
  });

  it("не приймає тіло, яке не є формою", async () => {
    const request = new Request("https://api.test/api/messages/media", {
      method: "POST",
      body: "не форма",
      headers: { "Content-Type": "application/json" },
    });

    expect((await handleMessageMediaUpload(request, ENV)).status).toBe(400);
  });

  it("не приймає метод, який не є POST", async () => {
    const request = new Request("https://api.test/api/messages/media", { method: "PUT" });

    expect((await handleMessageMediaUpload(request, ENV)).status).toBe(405);
  });

  it("не шукає файл, якщо людину не впізнано", async () => {
    asUser({ ok: false, response: new Response("{}", { status: 401 }) });

    const response = await handleMessageMediaUpload(uploadForm(), ENV);

    expect(response.status).toBe(401);
    expect(uploadMessageMedia).not.toHaveBeenCalled();
  });

  it("помилку сховища не випускає назовні — людині 500, деталі в лог", async () => {
    uploadMessageMedia.mockRejectedValue(new Error("R2 unavailable"));

    expect((await handleMessageMediaUpload(uploadForm(), ENV)).status).toBe(500);
  });
});

describe("віддання файлу", () => {
  it("віддає байти з типом, ETag і immutable", async () => {
    readMessageMedia.mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      httpEtag: '"etag-1"',
      writeHttpMetadata: (headers: Headers) => headers.set("Content-Type", "image/png"),
    });

    const response = await handleMessageMediaFile(ENV, KEY);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("ETag")).toBe('"etag-1"');
    expect(response.headers.get("Cache-Control")).toContain("immutable");
  });

  it("без метаданих віддає загальний тип, а не порожній", async () => {
    readMessageMedia.mockResolvedValue({
      body: new Uint8Array([1]),
      httpEtag: '"e"',
      writeHttpMetadata: () => {},
    });

    expect((await handleMessageMediaFile(ENV, KEY)).headers.get("Content-Type")).toBe(
      "application/octet-stream",
    );
  });

  it("невгаданий і чужий ключ дають однакову 404", async () => {
    readMessageMedia.mockResolvedValue(null);

    expect((await handleMessageMediaFile(ENV, "msg/1/nope.png")).status).toBe(404);
    expect((await handleMessageMediaFile(ENV, "shop/9/other.png")).status).toBe(404);
  });

  it("помилку читання не випускає назовні", async () => {
    readMessageMedia.mockRejectedValue(new Error("R2 down"));

    expect((await handleMessageMediaFile(ENV, KEY)).status).toBe(500);
  });
});
