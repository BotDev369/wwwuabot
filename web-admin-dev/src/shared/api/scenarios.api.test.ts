/**
 * Контракт адмінського читача контенту: адреса, метод і **тіло запиту**.
 *
 * Тут три речі, які ламаються мовчки й коштують рядків даних:
 *
 * 1. `update` і `delete` йдуть за **номером** (`id`). За адресою (`slug`)
 *    перейменування неможливе, тож адреса в цих викликах — лише замовчування
 *    для рядків без номера (`docs/CONTENT_MODEL.md`).
 * 2. `rich_message` їде рядком `"true"`/`"false"`: так його пише бота, який
 *    читає цю колонку (`ScenarioRepository`), і `writeScenario` мусить говорити
 *    з ним на одній мові.
 * 3. Список іде з `If-None-Match`, а `304` — це «немає чого оновлювати», не
 *    помилка: без цієї гілки таблиця сценаріїв блимала б на кожному
 *    перемальовуванні.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  deleteScenario,
  listScenarios,
  readScenario,
  saveScenarioFields,
  updateScenarioFields,
  writeScenario,
} from "./scenarios.api";

const reload = vi.fn();

/** Відповідь `fetch` із мінімально потрібним; тіло — уже розпарсене. */
function response(status: number, body: unknown = {}, etag: string | null = null): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => (name === "ETag" ? etag : null) },
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(result: Response | ((url: string) => Response)) {
  const fetchMock = vi.fn(async (input: string, _init?: RequestInit) =>
    typeof result === "function" ? result(input) : result,
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Тіло останнього запиту: без нього тест перевіряв би самі себе. */
function lastCall(fetchMock: ReturnType<typeof vi.fn>): [string, RequestInit] {
  const calls = fetchMock.mock.calls;
  return calls[calls.length - 1] as unknown as [string, RequestInit];
}

/** Тіло останнього запиту. */
function lastBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return JSON.parse(lastCall(fetchMock)[1].body as string) as Record<string, unknown>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.stubGlobal("window", { location: { reload } });
});

describe("читання сценарію в адмінці", () => {
  it("адреса й метод — ті самі, що в ендпоінті", async () => {
    const fetchMock = stubFetch(response(200, { success: true, data: null }));
    await readScenario("promo");

    const [url, init] = lastCall(fetchMock);
    expect(url).toBe("/api/portal/scenarios/read");
    expect(init.method).toBe("POST");
    expect(lastBody(fetchMock)).toEqual({ slug: "promo" });
  });

  it("рядок без даних повертається як null, а не як падіння", async () => {
    stubFetch(response(200, { success: true, data: null }));
    expect(await readScenario("promo")).toBeNull();
  });
});

describe("запис сценарію в адмінці", () => {
  it("rich_message їде рядком — так його читає бот", async () => {
    const fetchMock = stubFetch(response(200, { success: true }));
    await writeScenario("promo", "[]", true);

    expect(lastBody(fetchMock)).toEqual({ slug: "promo", rich_data: "[]", rich_message: "true" });

    await writeScenario("promo", "[]", false);
    expect(lastBody(fetchMock)).toMatchObject({ rich_message: "false" });
  });

  it("поля сторінки летять разом з адресою, а не окремим викликом", async () => {
    const fetchMock = stubFetch(response(200, { success: true }));
    await saveScenarioFields("promo", { title: "Промо", is_active: 1 });

    expect(lastBody(fetchMock)).toEqual({ slug: "promo", title: "Промо", is_active: 1 });
  });
});

describe("оновлення й видалення сценарію", () => {
  it("⛔ оновлення йде за номером: за адресою перейменування неможливе", async () => {
    const fetchMock = stubFetch(response(200, { success: true, id: 12, slug: "promo-new" }));

    const result = await updateScenarioFields({ id: 12, slug: "promo" }, { slug: "promo-new" });

    const [url, init] = lastCall(fetchMock);
    expect(url).toBe("/api/portal/scenarios/update");
    expect(init.method).toBe("POST");
    // `slug` у полі — це **нова** адреса, а не посилання на рядок.
    expect(lastBody(fetchMock)).toEqual({ id: 12, slug: "promo-new" });
    expect(result).toEqual({ id: 12, slug: "promo-new", updated_at: undefined });
  });

  it("рядок без номера лишається адресним, а `undefined` не потрапляє в тіло", async () => {
    const fetchMock = stubFetch(response(200, { success: true, deleted: true }));

    await deleteScenario({ id: null, slug: "promo" });

    expect(lastBody(fetchMock)).toEqual({ slug: "promo" });
    expect(JSON.stringify(lastBody(fetchMock))).not.toContain("undefined");
  });

  it("відповідь без номера не вигадує його: null, а не 0", async () => {
    stubFetch(response(200, { success: true }));
    expect(await updateScenarioFields({ id: 5, slug: "promo" }, {})).toEqual({
      id: null,
      slug: null,
      updated_at: undefined,
    });
  });
});

describe("список сценаріїв і ETag", () => {
  it("етag їде в If-None-Match, а 304 — це не помилка", async () => {
    const fetchMock = stubFetch(response(304));

    const result = await listScenarios('"abc"');

    const [url, init] = lastCall(fetchMock);
    expect(url).toBe("/api/portal/scenarios/list");
    expect((init.headers as Record<string, string>)["If-None-Match"]).toBe('"abc"');
    expect(result).toEqual({ notModified: true, items: [], etag: '"abc"' });
  });

  it("без etag заголовок не надсилається — порожній такий самий сенс", async () => {
    const fetchMock = stubFetch(response(200, { success: true, items: [] }, '"next"'));
    const result = await listScenarios(null);

    const [, init] = lastCall(fetchMock);
    expect(init.headers).toEqual({});
    expect(result).toEqual({ notModified: false, items: [], etag: '"next"' });
  });

  it("401 перезавантажує сторінку й каже про сесійну помилку", async () => {
    stubFetch(response(401));
    await expect(listScenarios(null)).rejects.toThrow("Session expired");
    expect(reload).toHaveBeenCalled();
  });

  it("помилка сервера лишається помилкою, а не порожнім списком", async () => {
    stubFetch(response(500));
    await expect(listScenarios(null)).rejects.toThrow("HTTP 500");
  });
});
