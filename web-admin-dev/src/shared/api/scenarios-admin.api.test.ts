/**
 * Транспорт двох адмінських таблиць: кожен виклик іде на свій шлях і везе
 * рівно ті поля, які змінили.
 *
 * @module web-admin-dev/src/shared/api/scenarios-admin.api.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = { request: vi.fn() };
vi.mock("./client", () => ({ apiFetch: mocks.request }));
const {
  listBotScenarios,
  readBotScenario,
  updateBotScenario,
  listPlatformPages,
  readPlatformPage,
  updatePlatformPage,
} = await import("./scenarios-admin.api");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("екрани бота", () => {
  it("список і один рядок", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true, items: [{ id: 1 }] });
    expect(await listBotScenarios()).toEqual([{ id: 1 }]);
    expect(mocks.request).toHaveBeenCalledWith("/api/admin/bot-scenarios");

    mocks.request.mockResolvedValueOnce({ ok: true, item: { id: 2 } });
    expect(await readBotScenario(2)).toEqual({ id: 2 });
    expect(mocks.request).toHaveBeenCalledWith(
      "/api/admin/bot-scenarios/read",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("правка везе номер і лише передані поля", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true });
    await updateBotScenario(3, { caption_top: "Новий" });

    const [, init] = mocks.request.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ id: 3, caption_top: "Новий" });
  });
});

describe("сторінки платформи", () => {
  it("список і один рядок", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true, items: [{ id: 5 }] });
    expect(await listPlatformPages()).toEqual([{ id: 5 }]);
    expect(mocks.request).toHaveBeenCalledWith("/api/admin/platform-pages");

    mocks.request.mockResolvedValueOnce({ ok: true, item: { id: 6 } });
    expect(await readPlatformPage(6)).toEqual({ id: 6 });
    expect(mocks.request).toHaveBeenCalledWith(
      "/api/admin/platform-pages/read",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("правка везе номер і поля сторінки", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true });
    await updatePlatformPage(7, { title: "Назва", is_public: 1 });

    const [, init] = mocks.request.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ id: 7, title: "Назва", is_public: 1 });
  });
});
