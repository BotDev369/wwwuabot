// @vitest-environment jsdom
/**
 * Хук екрана дат: що станеться, коли людина збереже або видалить рядок.
 *
 * Це єдиний власник стану списку дат, тож перевіряється саме він: помилка
 * сервера мусить лишитися на екрані, а зберегене — перечитатися, інакше
 * список показує те, чого вже немає.
 *
 * @module packages/ui/src/blocks/my-dates-table/useMyDates.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMyDates } from "./useMyDates";

const DATE = {
  id: "1",
  user_id: 7,
  date: "1980-03-03",
  type: "person",
  name: "Сьогодні",
  tags: [],
  notes: "",
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
};

/** Відповідь на будь-який запит: за замовчуванням список із однієї дати. */
function stubApi(body: unknown = { ok: true, dates: [DATE] }): ReturnType<typeof vi.fn> {
  const mock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** `useMyDates` спирається на спільний діалог; підміняємо його підтвердження. */
function stubDialog(): { confirm: ReturnType<typeof vi.fn> } {
  const confirm = vi.fn(async () => true);
  vi.stubGlobal("__dialogConfirm", confirm);
  return { confirm };
}

beforeEach(() => {
  window.history.replaceState({}, "", "/mydate");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMyDates", () => {
  it("завантажує список і знімає стан завантаження", async () => {
    stubApi();
    const { result } = renderHook(() => useMyDates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dates).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("помилку сервера показує, а не ковтає", async () => {
    stubApi({ ok: false, error: "Немає доступу" });
    const { result } = renderHook(() => useMyDates());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toContain("Немає доступу");
  });

  it("збережена дата з'являється в списку після перечитування", async () => {
    const api = stubApi();
    const { result } = renderHook(() => useMyDates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    api.mockImplementation(
      async () =>
        new Response(JSON.stringify({ ok: true, dates: [DATE, { ...DATE, id: "2" }] }), {
          status: 200,
        }),
    );
    await act(async () => {
      await result.current.handleSave({ date: "2003-02-15" });
    });

    await waitFor(() => expect(result.current.dates).toHaveLength(2));
  });

  it("помилка збереження не закриває модалку мовчки — її видно", async () => {
    const api = stubApi();
    const { result } = renderHook(() => useMyDates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    api.mockImplementation(async () => new Response("{}", { status: 200 }));
    await act(async () => {
      await result.current.handleSave({ id: "1", date: "1980-03-03" });
    });
    // Перший виклик save дав помилку (тіло без `error`), тож стан лишається
    // видимим замість тихої порожнечі.
    expect(result.current.error).not.toBeNull();
  });

  it("видалення рядка перечитує список", async () => {
    const api = stubApi();
    const { result } = renderHook(() => useMyDates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    api.mockImplementation(
      async () => new Response(JSON.stringify({ ok: true, dates: [] }), { status: 200 }),
    );
    await act(async () => {
      await result.current.handleDelete("1");
    });
    await waitFor(() => expect(result.current.dates).toHaveLength(0));
  });

  it("співставлення йде на сторінку систем з вибраними датами", async () => {
    stubApi({ ok: true, dates: [DATE, { ...DATE, id: "2", date: "2003-02-15" }] });
    let href = "";
    const real = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get search() {
          return real.search;
        },
        get href() {
          return href;
        },
        set href(next: string) {
          href = next;
        },
      },
    });

    const { result } = renderHook(() => useMyDates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Однієї дати мало: порівняння без сенсу, тож переходу бути не повинно.
    act(() => {
      result.current.toggleSelect("1");
    });
    act(() => {
      result.current.handleBulkCompare();
    });
    expect(href).toBe("");

    act(() => {
      result.current.toggleSelect("2");
    });
    act(() => {
      result.current.handleBulkCompare();
    });
    // Порядок — з відсортованого списку, тобто той самий, що людина бачить у
    // таблиці: за замовчуванням нові дати першими.
    expect(href).toBe("/mydate/compare/systems?dates=2003-02-15%2C1980-03-03");
  });

  it("аналіз іде на вибір систем і параметрів, а не одразу в результат", async () => {
    stubApi();
    let href = "";
    const real = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get search() {
          return real.search;
        },
        get href() {
          return href;
        },
        set href(next: string) {
          href = next;
        },
      },
    });

    const { result } = renderHook(() => useMyDates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Нічого не вибрано — переходити нема куди.
    act(() => {
      result.current.handleBulkAnalyze();
    });
    expect(href).toBe("");

    act(() => {
      result.current.toggleSelect("1");
    });
    act(() => {
      result.current.handleBulkAnalyze();
    });
    // Адреса — крок вибору (`?dates=` читає `CompareSystemsBlock`), а не
    // `?date=` сторінки аналізу: результат мусить бути кроком далі.
    expect(href).toBe("/mydate/compare/systems?dates=1980-03-03");
  });
});
