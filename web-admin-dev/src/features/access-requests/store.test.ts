// @vitest-environment jsdom
/**
 * «Повідомлення»: список із сервера, дії над зверненнями й пам'ять пошуку,
 * який переживає перезапуск панелі (D31).
 *
 * @module web-admin-dev/src/features/access-requests/store.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../../shared/api/access-requests.api", () => ({
  listAccessRequests: api.list,
  createAccessRequest: api.create,
  updateAccessRequest: api.update,
  deleteAccessRequest: api.remove,
}));

const ITEM = { id: 1, user_id: 5, text: "Пустіть", first_name: "Сергій", last_name: null } as never;
const SECOND = {
  id: 2,
  user_id: 6,
  text: "Питання",
  first_name: "Олена",
  last_name: null,
} as never;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.resetModules();
});

describe("пошук у «Повідомленнях»", () => {
  it("стартує зі збереженого запиту й пише зміни", async () => {
    localStorage.setItem("wb.admin.messages.view", JSON.stringify({ search: "сер" }));
    const { useAccessRequests } = await import("./store");

    expect(useAccessRequests.getState().search).toBe("сер");

    useAccessRequests.getState().setSearch("олен");
    expect(useAccessRequests.getState().search).toBe("олен");
    expect(JSON.parse(localStorage.getItem("wb.admin.messages.view") ?? "null")).toEqual({
      search: "олен",
    });
  });

  it("без збереженого — порожній пошук", async () => {
    const { useAccessRequests } = await import("./store");

    expect(useAccessRequests.getState().search).toBe("");
  });
});

describe("звернення", () => {
  it("load везе список, а помилка лишається видимою", async () => {
    const { useAccessRequests } = await import("./store");

    api.list.mockResolvedValueOnce([ITEM]);
    await useAccessRequests.getState().load();
    expect(useAccessRequests.getState().items).toEqual([ITEM]);
    expect(useAccessRequests.getState().status).toBe("idle");

    api.list.mockRejectedValueOnce(new Error("мережа"));
    await useAccessRequests.getState().load();
    expect(useAccessRequests.getState().status).toBe("error");
    expect(useAccessRequests.getState().errorMsg).toBe("мережа");
  });

  it("create та update перечитують список, remove прибирає рядок на місці", async () => {
    const { useAccessRequests } = await import("./store");
    api.list.mockResolvedValue([ITEM, SECOND]);

    await useAccessRequests.getState().create(5, "текст");
    expect(api.create).toHaveBeenCalledWith(5, "текст");
    expect(useAccessRequests.getState().items).toHaveLength(2);

    await useAccessRequests.getState().update(1, "нове");
    expect(api.update).toHaveBeenCalledWith(1, "нове");
    expect(useAccessRequests.getState().items).toHaveLength(2);

    await useAccessRequests.getState().remove(1);
    expect(api.remove).toHaveBeenCalledWith(1);
    expect(useAccessRequests.getState().items).toEqual([SECOND]);
  });
});
