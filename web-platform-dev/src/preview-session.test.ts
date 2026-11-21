// @vitest-environment jsdom
/**
 * Клієнтська сесія прев'ю: ставить `initData` лише коли сервер справді віддав
 * підпис, і мовчить, коли шлях відповів 404 (прод-сторінка йде далі як завжди).
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
});
