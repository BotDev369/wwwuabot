/**
 * Клієнт аналізу: що саме йде на сервер і що повертається назад.
 * Три блоки користуються цим модулем, тож перевіряється спільна угода: маршрут,
 * тіло запиту і — головне — що помилка сервера не губиться.
 * @module packages/ui/src/blocks/mydate/api.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeDate, compareDates, fetchAnalysis, fetchSystems } from "./api";

function respond(body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
  );
}

/** Тіло останнього запиту — саме воно відрізняє ендпоінт від ендпоінта. */
function lastCall(): { url: string; init?: RequestInit } {
  const mock = vi.mocked(fetch);
  const call = mock.mock.calls.at(-1);
  if (!call) throw new Error("запиту не було");
  return { url: String(call[0]), init: call[1] };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchSystems", () => {
  it("бере реєстр систем і повертає його масивом", async () => {
    const systems = [{ id: "western", name: "Західна", description: "", implemented: true }];
    respond({ ok: true, systems });
    await expect(fetchSystems()).resolves.toEqual(systems);
    expect(lastCall().url).toBe("/api/mydate/systems");
  });

  it("віддає порожній масив, а не кидає помилку, коли реєстра немає", async () => {
    respond({ ok: false });
    await expect(fetchSystems()).resolves.toEqual([]);
  });
});

describe("analyzeDate", () => {
  const result = { parameters: [{ key: "sign", label: "Знак", value: "Овен" }], comingSoon: [] };

  it("надсилає дату й систему методом POST", async () => {
    respond({ ok: true, result });
    await expect(analyzeDate("1980-03-03", "western")).resolves.toEqual(result);
    const call = lastCall();
    expect(call.url).toBe("/api/mydate/analyze");
    expect(call.init?.method).toBe("POST");
    expect(JSON.parse(String(call.init?.body))).toEqual({
      date: "1980-03-03",
      systemId: "western",
    });
  });

  it("помилку сервера показує людині, а не ковтає", async () => {
    respond({ ok: false, error: "Система не реалізована" });
    await expect(analyzeDate("1980-03-03", "vedic")).rejects.toThrow("Система не реалізована");
  });
});

describe("fetchAnalysis", () => {
  it("читає збережений аналіз за датою", async () => {
    const systems = { western: { parameters: [], comingSoon: [] } };
    respond({ ok: true, systems });
    await expect(fetchAnalysis("1980-03-03")).resolves.toEqual(systems);
    expect(lastCall().url).toBe("/api/mydate/analysis/1980-03-03");
  });

  it("немає аналізу — порожня мапа, а не помилка", async () => {
    respond({ ok: false });
    await expect(fetchAnalysis("1980-03-03")).resolves.toEqual({});
  });
});

describe("compareDates", () => {
  it("надсилає дати разом з фільтрами і повертає матрицю", async () => {
    const matrix = { "1980-03-03": { western: { sign: "Овен" } } };
    respond({ ok: true, matrix });
    await expect(compareDates(["1980-03-03"], ["western"], ["sign"])).resolves.toEqual(matrix);
    const call = lastCall();
    expect(call.url).toBe("/api/mydate/compare");
    expect(JSON.parse(String(call.init?.body))).toEqual({
      dates: ["1980-03-03"],
      systemIds: ["western"],
      parameterKeys: ["sign"],
    });
  });

  it("помилку сервера показує людині", async () => {
    respond({ ok: false });
    await expect(compareDates(["1980-03-03"])).rejects.toThrow("Помилка співставлення");
  });
});
