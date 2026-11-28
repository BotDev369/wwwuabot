// @vitest-environment jsdom
/**
 * Спільна пам'ять вигляду списків: ключі екранів, типові значення, хук і
 * недоступне сховище.
 *
 * @module web-admin-dev/src/shared/storage/list-memory.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { StoredView } from "./list-memory";

const queryOf = (raw: StoredView | null) => ({
  query: typeof raw?.query === "string" ? raw.query : "",
});

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe("пам'ять вигляду списку", () => {
  it("без збереженого — типові поля", async () => {
    const { readListMemory } = await import("./list-memory");

    expect(readListMemory("bot-scenarios", queryOf)).toEqual({ query: "" });
  });

  it("пише й читає під ключем свого екрана", async () => {
    const { readListMemory, writeListMemory } = await import("./list-memory");
    writeListMemory("desk", { queue: "buffy", archived: "only" });

    expect(localStorage.getItem("wb.admin.desk.view")).toBe(
      JSON.stringify({ queue: "buffy", archived: "only" }),
    );
    expect(readListMemory("desk", (raw) => ({ queue: raw?.queue ?? "all" }))).toEqual({
      queue: "buffy",
    });
  });

  it("битий JSON і не-об'єкт дають типові поля", async () => {
    const { readListMemory } = await import("./list-memory");

    localStorage.setItem("wb.admin.desk.view", "{не json");
    expect(readListMemory("desk", queryOf)).toEqual({ query: "" });

    localStorage.setItem("wb.admin.desk.view", "42");
    expect(readListMemory("desk", queryOf)).toEqual({ query: "" });
  });

  it("хук віддає збережений вибір і дописує зміни", async () => {
    localStorage.setItem("wb.admin.desk.view", JSON.stringify({ queue: "serhii" }));
    const { useListMemory } = await import("./list-memory");
    const { result } = renderHook(() =>
      useListMemory("desk", (raw) => ({
        queue: typeof raw?.queue === "string" ? raw.queue : "all",
        archived: typeof raw?.archived === "string" ? raw.archived : "hide",
      })),
    );

    expect(result.current[0]).toEqual({ queue: "serhii", archived: "hide" });

    act(() => result.current[1]({ archived: "only" }));
    expect(result.current[0]).toEqual({ queue: "serhii", archived: "only" });
    expect(JSON.parse(localStorage.getItem("wb.admin.desk.view") ?? "null")).toEqual({
      queue: "serhii",
      archived: "only",
    });
  });

  it("недоступне сховище не валить екран", async () => {
    const { readListMemory, writeListMemory } = await import("./list-memory");
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readListMemory("desk", () => ({ queue: "all" }))).toEqual({ queue: "all" });
    expect(() => writeListMemory("desk", { queue: "all" })).not.toThrow();

    get.mockRestore();
    set.mockRestore();
  });
});
