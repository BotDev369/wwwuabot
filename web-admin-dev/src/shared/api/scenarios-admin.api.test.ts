/**
 * Транспорт адмінки: ключі й поля сценаріїв бота та сторінок платформи.
 *
 * @module web-admin-dev/src/shared/api/scenarios-admin.api.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = { request: vi.fn() };
vi.mock("./client", () => ({ apiFetch: mocks.request }));
const {
  createBotScenario,
  listBotScenarios,
  readBotScenario,
  updateBotScenario,
  listPlatformPages,
  readPlatformPage,
  reindexSearch,
} = await import("./scenarios-admin.api");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("сценарії бота", () => {
  it("список і один сценарій", async () => {
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
    await updateBotScenario(3, { kind: "rich", rich_html: "<b>ok</b>" });

    const [, init] = mocks.request.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      id: 3,
      kind: "rich",
      rich_html: "<b>ok</b>",
    });
  });
});

describe("проєкт у запиті", () => {
  it("ключ їде параметром у читання, запис і перебудову", async () => {
    mocks.request.mockResolvedValue({ ok: true, items: [], item: null, pages: 0, products: 0 });

    await listBotScenarios("shop-a");
    await readBotScenario(2, "shop-a");
    await updateBotScenario(3, { kind: "rich" }, "shop-a");
    await createBotScenario("/start", { kind: "widget", widget_html: "<b>ok</b>" }, "shop-a");
    await listPlatformPages("shop-a");
    await readPlatformPage(6, "shop-a");
    await reindexSearch("shop-a");

    const urls = mocks.request.mock.calls.map((call) => call[0] as string);
    expect(urls).toEqual([
      "/api/admin/bot-scenarios?tenant=shop-a",
      "/api/admin/bot-scenarios/read?tenant=shop-a",
      "/api/admin/bot-scenarios/update?tenant=shop-a",
      "/api/admin/bot-scenarios/create?tenant=shop-a",
      "/api/admin/platform-pages?tenant=shop-a",
      "/api/admin/platform-pages/read?tenant=shop-a",
      "/api/admin/search/reindex?tenant=shop-a",
    ]);
  });

  it("створення везе ключ і лише вибраний тип розмітки", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true, item: { id: 9, lookup: "/about" } });

    const created = await createBotScenario(
      "/about",
      { kind: "rich", rich_html: "<b>Про нас</b>" },
      "shop-a",
    );

    const [, init] = mocks.request.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      lookup: "/about",
      kind: "rich",
      rich_html: "<b>Про нас</b>",
    });
    expect(created).toMatchObject({ id: 9 });
  });
});

describe("сторінки платформи", () => {
  it("список і один рядок", async () => {
    mocks.request.mockResolvedValueOnce({ ok: true, items: [{ id: 5 }] });
    expect(await listPlatformPages()).toEqual([{ id: 5 }]);
    expect(mocks.request).toHaveBeenCalledWith("/api/admin/platform-pages");

    mocks.request.mockResolvedValueOnce({ ok: true, item: { id: 6 } });
    expect(await readPlatformPage(6)).toEqual({ id: 6 });
  });
});
