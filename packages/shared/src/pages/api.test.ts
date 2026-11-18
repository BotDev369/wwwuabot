/**
 * Клієнт сторінок: **своє й опубліковане — різні запити**.
 *
 * Помилка тут показала б чужі приватні сторінки або повернула б `undefined`
 * замість списку. Тому перевіряється саме форма запиту: який шлях, який метод і
 * що стається з відповіддю без сторінки.
 *
 * @module packages/shared/src/pages/api.test
 */

import { describe, expect, it, vi } from "vitest";
import { createPagesApi, type PagesTransport } from "./api";

const PATHS = { own: "/api/user/pages", public: "/api/public/pages" };

const transport = (answer: unknown): PagesTransport =>
  vi.fn(async () => answer) as unknown as PagesTransport;

describe("читання", () => {
  it("свої сторінки йдуть зі свого шляху", async () => {
    const fetchJson = transport({ ok: true, pages: [{ id: 1 }] });
    const api = createPagesApi(fetchJson, PATHS);

    expect(await api.listOwn()).toEqual([{ id: 1 }]);
    expect(fetchJson).toHaveBeenCalledWith("/api/user/pages");
  });

  it("порожня відповідь — це порожній список, а не `undefined`", async () => {
    const api = createPagesApi(transport({ ok: true }), PATHS);

    expect(await api.listOwn()).toEqual([]);
    expect(await api.published()).toEqual([]);
  });

  it("опубліковане читається з публічного шляху", async () => {
    const fetchJson = transport({ ok: true, pages: [{ id: 2 }] });
    const api = createPagesApi(fetchJson, PATHS);

    expect(await api.published()).toEqual([{ id: 2 }]);
    expect(fetchJson).toHaveBeenCalledWith("/api/public/pages");
  });
});
