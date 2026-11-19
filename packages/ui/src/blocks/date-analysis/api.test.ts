/**
 * Клієнт аналізу: що саме йде на сервер і що повертається назад.
 * Екран портрет й екран дат користуються ним обидва, тож перевіряється спільна
 * угода: маршрут, тіло запиту і — головне — що помилка сервера не губиться.
 *
 * @module packages/ui/src/blocks/date-analysis/api.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteMyDate,
  deleteMyDates,
  fetchDossiers,
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

const CLAIM = {
  qualityId: "initiative",
  level: 4,
  layer: "symbolic",
  sourceId: "western",
  sourceVersion: "1",
  evidence: "Сонце в Овні: початок без дозволу",
  method: "mapped",
  temporal: "trait",
  confidence: 0.16,
};

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

describe("fetchDossiers", () => {
  it("надсилає дати й вид та повертає свідчення", async () => {
    const dossiers = [
      { date: "1980-03-03", kind: "person", symbol: "Риби", claims: [CLAIM], note: null },
    ];
    respond({ ok: true, dossiers, survey: null });
    await expect(fetchDossiers(["1980-03-03"], "person", ["western"], false)).resolves.toEqual({
      dossiers,
      survey: null,
    });
    const call = lastCall();
    expect(call.url).toBe("/api/mydate/dossier");
    expect(call.init?.method).toBe("POST");
    expect(JSON.parse(String(call.init?.body))).toEqual({
      dates: ["1980-03-03"],
      kind: "person",
      lenses: ["western"],
      survey: false,
    });
  });

  it("згода на виміряне їде тим самим запитом і повертається окремо", async () => {
    const survey = { measuredAt: "2026-11-19", claims: [CLAIM] };
    respond({ ok: true, dossiers: [], survey });
    await expect(fetchDossiers(["1980-03-03"], undefined, ["western"], true)).resolves.toEqual({
      dossiers: [],
      survey,
    });
    expect(JSON.parse(String(lastCall().init?.body)).survey).toBe(true);
  });

  it("помилку сервера показує людині", async () => {
    respond({ ok: false, error: "Немає свідчень" });
    await expect(fetchDossiers(["1980-03-03"], undefined, ["western"], false)).rejects.toThrow(
      "Немає свідчень",
    );
  });

  it("без тіла лишається зрозумілий текст із кодом", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );
    await expect(fetchDossiers(["1980-03-03"], undefined, ["western"], false)).rejects.toThrow(
      /Помилка аналізу.*503/,
    );
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
    expect(lastCall().url).toBe("/api/my-dates?ids=1,2");
  });

  it("помилка масового видалення показується, а не ковтається", async () => {
    respond({ ok: false, error: "Чужий рядок" });
    await expect(deleteMyDates(["9"])).rejects.toThrow("Чужий рядок");
  });
});
