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

describe("запис", () => {
  it("збереження надсилає POST із тілом чернетки", async () => {
    const fetchJson = transport({ ok: true, page: { id: 3 } });
    const api = createPagesApi(fetchJson, PATHS);
    const draft = { title: "Про мене" } as never;

    expect(await api.save(draft)).toEqual({ id: 3 });
    expect(fetchJson).toHaveBeenCalledWith("/api/user/pages", {
      method: "POST",
      body: JSON.stringify(draft),
    });
  });

  it("відповідь без сторінки — це `null`, а не помилка", async () => {
    const api = createPagesApi(transport({ ok: true }), PATHS);

    expect(await api.save({ title: "Про мене" } as never)).toBeNull();
  });

  it("видалення надсилає DELETE із номером", async () => {
    const fetchJson = transport({ ok: true });
    const api = createPagesApi(fetchJson, PATHS);

    await api.remove(7);

    expect(fetchJson).toHaveBeenCalledWith("/api/user/pages?id=7", { method: "DELETE" });
  });

  it("відмова видалення кидає причину, а не мовчить", async () => {
    const api = createPagesApi(transport({ ok: false, error: "Не ваша сторінка" }), PATHS);

    await expect(api.remove(7)).rejects.toThrow("Не ваша сторінка");
  });

  it("відмова без тексту теж кидає", async () => {
    const api = createPagesApi(transport({ ok: false }), PATHS);

    await expect(api.remove(7)).rejects.toThrow("Не вдалося видалити сторінку");
  });
});
