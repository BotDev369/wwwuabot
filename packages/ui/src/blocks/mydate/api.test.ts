/**
 * Клієнт аналізу: що саме йде на сервер і що повертається назад.
 * Екран аналізу й екран дат користуються ним обидва, тож перевіряється спільна
 * угода: маршрут, тіло запиту і — головне — що помилка сервера не губиться.
 * @module packages/ui/src/blocks/mydate/api.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compareDates,
  deleteMyDate,
  deleteMyDates,
  fetchMyDates,
  fetchSystems,
  saveMyDate,
} from "./api";

function respond(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
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

describe("compareDates", () => {
  it("надсилає дати разом з фільтрами і повертає матрицю з текстами", async () => {
    const matrix = { "1980-03-03": { western: { sign: "Овен" } } };
    const details = { "1980-03-03": { western: { sign: { about: "Що це", meaning: "Що дає" } } } };
    respond({ ok: true, matrix, details });
    await expect(compareDates(["1980-03-03"], ["western"], ["sign"])).resolves.toEqual({
      matrix,
      details,
      names: {},
    });
    const call = lastCall();
    expect(call.url).toBe("/api/mydate/compare");
    expect(JSON.parse(String(call.init?.body))).toEqual({
      dates: ["1980-03-03"],
      systemIds: ["western"],
      parameterKeys: ["sign"],
    });
  });

  // Старий сервер без текстів не має лишати таблицю без пояснень узагалі:
  // порожні мапи — це той самий екран, лише без розкриття рядка.
  it("без `details` у відповіді матриця все одно приходить", async () => {
    const matrix = { "1980-03-03": { western: { sign: "Овен" } } };
    respond({ ok: true, matrix });
    await expect(compareDates(["1980-03-03"])).resolves.toEqual({
      matrix,
      details: {},
      names: {},
    });
  });

  // Назва дати — те, чим людина її знає: без неї в шапці лишається число.
  it("назви дат приходять разом із матрицею", async () => {
    respond({ ok: true, matrix: {}, details: {}, names: { "1980-03-03": "Мама" } });
    await expect(compareDates(["1980-03-03"])).resolves.toEqual({
      matrix: {},
      details: {},
      names: { "1980-03-03": "Мама" },
    });
  });

  it("помилку сервера показує людині", async () => {
    respond({ ok: false });
    await expect(compareDates(["1980-03-03"])).rejects.toThrow("Помилка аналізу");
  });
});

describe("дати: CRUD", () => {
  it("читає список дат", async () => {
    const dates = [{ id: "1", date: "1980-03-03" }];
    respond({ ok: true, dates });
    await expect(fetchMyDates()).resolves.toEqual(dates);
    expect(lastCall().url).toBe("/api/my-dates");
  });

  it("повідомлення сервера важливіші за код статусу — людині треба знати, що робити", async () => {
    respond({ ok: false, error: "Немає доступу" }, 403);
    await expect(fetchMyDates()).rejects.toThrow("Немає доступу");
  });

  it("без тіла лишається зрозумілий текст із кодом", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );
    await expect(fetchMyDates()).rejects.toThrow(/Помилка завантаження.*503/);
  });

  it("нова дата йде POST-ом, наявна — PUT-ом", async () => {
    respond({ ok: true });
    await saveMyDate({ date: "1980-03-03" });
    expect(lastCall().init?.method).toBe("POST");

    await saveMyDate({ id: "1", date: "1980-03-03" });
    expect(lastCall().init?.method).toBe("PUT");
  });

  it("збереження з помилкою сервера не губиться", async () => {
    respond({ ok: false, error: "Дата невірна" });
    await expect(saveMyDate({ date: "1980-03-03" })).rejects.toThrow("Дата невірна");
  });

  it("видалення однієї дати йде за її номером", async () => {
    respond({ ok: true });
    await deleteMyDate("1");
    const call = lastCall();
    expect(call.url).toBe("/api/my-dates?id=1");
    expect(call.init?.method).toBe("DELETE");
  });

  it("масове видалення переносить усі номери", async () => {
    respond({ ok: true });
    await deleteMyDates(["1", "2"]);
    // Кома в значенні query легальна, тож `encodeURIComponent` її не змінює —
    // важливо, що номери не злипаються з іншими параметрами.
    expect(lastCall().url).toBe("/api/my-dates?ids=1,2");
  });

  it("помилка масового видалення показується, а не ковтається", async () => {
    respond({ ok: false, error: "Чужий рядок" });
    await expect(deleteMyDates(["9"])).rejects.toThrow("Чужий рядок");
  });
});
