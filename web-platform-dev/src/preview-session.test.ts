// @vitest-environment jsdom
/**
 * Клієнтська сесія прев'ю: ставить `initData` лише коли сервер справді віддав
 * підпис, повторює холодну відмову дев-воркера і мовчить, коли шлях відповів
 * 404 (прод-сторінка йде далі як завжди).
 *
 * @module web-platform-dev/src/preview-session.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { installPreviewSession } from "./preview-session";

const INIT_DATA = `user=${encodeURIComponent('{"id":42,"first_name":"Preview"}')}&auth_date=1&hash=abc`;

function stubFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as { Telegram?: unknown }).Telegram;
});

describe("сесія прев'ю в застосунку", () => {
  it("ставить initData від сервера", async () => {
    stubFetch(200, { ok: true, initData: INIT_DATA });

    await installPreviewSession();

    expect(window.Telegram?.WebApp?.initData).toBe(INIT_DATA);
    expect(window.Telegram?.WebApp?.initDataUnsafe?.user).toEqual({
      id: 42,
      first_name: "Preview",
    });
  });

  it("⛔ 404 (прод) лишає сторінку без ідентичності", async () => {
    stubFetch(404, { ok: false });

    await installPreviewSession();

    expect(window.Telegram?.WebApp?.initData ?? "").toBe("");
  });

  it("холодний воркер (5xx) — повторює і ставить сесію", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("cold", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ initData: INIT_DATA }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await installPreviewSession();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(window.Telegram?.WebApp?.initData).toBe(INIT_DATA);
  });

  it("404 не повторює — це прод, а не відмова", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: false }), { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await installPreviewSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("порожня відповідь — теж привід повторити", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ initData: INIT_DATA }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await installPreviewSession();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(window.Telegram?.WebApp?.initData).toBe(INIT_DATA);
  });

  it("усі спроби відмовили — тихо лишає сторінку без сесії", async () => {
    const fetchMock = vi.fn(async () => new Response("cold", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await installPreviewSession();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(window.Telegram?.WebApp?.initData ?? "").toBe("");
  });
});
