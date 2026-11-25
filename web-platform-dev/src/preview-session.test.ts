// @vitest-environment jsdom
/**
 * Клієнтська сесія прев'ю: без ключа в адресі не питає сервер узагалі,
 * ставить `initData` лише коли сервер справді віддав підпис, повторює холодну
 * відмову дев-воркера і мовчить, коли шлях відповів 404.
 *
 * @module web-platform-dev/src/preview-session.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installPreviewSession } from "./preview-session";

const INIT_DATA = `user=${encodeURIComponent('{"id":42,"first_name":"Preview"}')}&auth_date=1&hash=abc`;
const KEY = "0123456789abcdef0123456789abcdef";

function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, "", "/?preview=" + KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as { Telegram?: unknown }).Telegram;
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("сесія прев'ю в застосунку", () => {
  it("ставить initData від сервера й прибирає ключ з адреси", async () => {
    const fetchMock = stubFetch(200, { ok: true, initData: INIT_DATA });

    await installPreviewSession();

    expect(window.Telegram?.WebApp?.initData).toBe(INIT_DATA);
    expect(window.Telegram?.WebApp?.initDataUnsafe?.user).toEqual({
      id: 42,
      first_name: "Preview",
    });
    const headers = (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<
      string,
      string
    >;
    expect(headers["X-Preview-Key"]).toBe(KEY);
    expect(window.location.search).not.toContain("preview=");
    expect(sessionStorage.getItem("preview-session-key")).toBe(KEY);
  });

  it("⛔ без ключа в адресі й у сховищі не питає сервер зовсім", async () => {
    window.history.replaceState(null, "", "/");
    const fetchMock = stubFetch(200, { ok: true, initData: INIT_DATA });

    await installPreviewSession();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.Telegram?.WebApp?.initData ?? "").toBe("");
  });

  it("ключ із попереднього відкриття працює після перезавантаження", async () => {
    sessionStorage.setItem("preview-session-key", KEY);
    window.history.replaceState(null, "", "/");
    stubFetch(200, { ok: true, initData: INIT_DATA });

    await installPreviewSession();

    expect(window.Telegram?.WebApp?.initData).toBe(INIT_DATA);
  });

  it("⛔ 404 (прод або немає ключа) лишає сторінку без ідентичності", async () => {
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
    const fetchMock = stubFetch(404, { ok: false });

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
