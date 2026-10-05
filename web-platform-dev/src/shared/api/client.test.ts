/**
 * Клієнт web: ідентичність у кожному запиті й **multipart без `Content-Type`**.
 *
 * Два рішення, які не видно в коді й ламаються на живій мережі. Перше — жоден
 * запит не йде «голим»: без підписаного `initData` сервер поверне 401, тож
 * клієнт один і додає заголовки сам. Друге — у multipart **`Content-Type` не
 * ставиться**: з ним браузер не допише межу частин і сервер не розбере форму,
 * тож файл просто не дійде.
 *
 * @module web-platform-dev/src/shared/api/client.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { apiFetchRaw, apiUpload } from "./client";

function stubFetch(response: Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const initData = (value: string): void => {
  vi.stubGlobal("Telegram", { WebApp: { initData: value } });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetchRaw", () => {
  it("додає підписований initData до кожного запиту", async () => {
    initData("signed-payload");
    const fetchMock = stubFetch(new Response("{}"));

    await apiFetchRaw("/api/messages");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get(INIT_DATA_HEADER)).toBe(
      "signed-payload",
    );
  });

  it("заголовок самого виклику має пріоритет над ідентичністю", async () => {
    initData("signed-payload");
    const fetchMock = stubFetch(new Response("{}"));

    await apiFetchRaw("/api/messages", { headers: { [INIT_DATA_HEADER]: "override" } });

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get(INIT_DATA_HEADER)).toBe("override");
  });
});

describe("apiUpload", () => {
  const photo = (): File =>
    new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });

  function formWith(peer: number, file: File): FormData {
    const form = new FormData();
    form.set("peer", String(peer));
    form.set("file", file);
    return form;
  }

  it("не ставить Content-Type — його визначає браузер", async () => {
    initData("signed-payload");
    const fetchMock = stubFetch(Response.json({ ok: true, media: { id: 1 } }));

    await apiUpload("/api/messages/media", formWith(42, photo()));

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Content-Type")).toBeNull();
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });

  it("повертає розібраний відповідь сервера", async () => {
    initData("x");
    stubFetch(Response.json({ ok: true, media: { id: 7, key: "msg/1/a.png" } }));

    await expect(apiUpload("/api/messages/media", formWith(42, photo()))).resolves.toEqual({
      ok: true,
      media: { id: 7, key: "msg/1/a.png" },
    });
  });

  it("помилку з сервера піднімає зрозумілою, а не з текстом відповіді", async () => {
    initData("x");
    stubFetch(Response.json({ ok: false, error: "Файл не додано" }, { status: 400 }));

    await expect(apiUpload("/api/messages/media", formWith(42, photo()))).rejects.toThrow(
      "Файл не додано",
    );
  });

  it("коли відповідь не JSON — каже код статусу, а не падає з розбору", async () => {
    initData("x");
    stubFetch(new Response("502", { status: 502 }));

    await expect(apiUpload("/api/messages/media", formWith(42, photo()))).rejects.toThrow(
      "HTTP 502",
    );
  });

  it("коли в помилці немає `error` — лишається код статусу", async () => {
    initData("x");
    stubFetch(Response.json({}, { status: 403 }));

    await expect(apiUpload("/api/messages/media", formWith(42, photo()))).rejects.toThrow(
      "HTTP 403",
    );
  });
});
