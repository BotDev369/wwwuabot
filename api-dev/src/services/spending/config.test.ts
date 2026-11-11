import { describe, expect, it } from "vitest";
import { batchKey, chunk, monthWindow, receiptsKey, REGIONS_SYNC_KEY, splitRange } from "./config";

describe("ключі кроків", () => {
  it("пачка надходжень не збігається з пачкою сплат", () => {
    expect(receiptsKey("2026-09", ["04360586"])).not.toBe(batchKey("2026-09", ["04360586"]));
    expect(receiptsKey("2026-09", ["04360586"])).toMatch(/^recipts:2026-09:[0-9a-f]{8}$/);
    expect(REGIONS_SYNC_KEY).not.toContain("2026");
  });
});

describe("вікно місяця", () => {
  it("дає перше й останнє число місяця", () => {
    expect(monthWindow("2026-09")).toEqual({
      period: "2026-09",
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("рахує лютий у звичайному й високосному році", () => {
    expect(monthWindow("2026-02").to).toBe("2026-02-28");
    expect(monthWindow("2024-02").to).toBe("2024-02-29");
  });

  it("відмовляється від не-YYYY-MM і від неіснуючого місяця", () => {
    expect(() => monthWindow("2026-9")).toThrow();
    expect(() => monthWindow("вересень")).toThrow();
    expect(() => monthWindow("2026-13")).toThrow();
  });
});

describe("ключ пачки", () => {
  it("не залежить від порядку кодів: набір той самий — ключ той самий", () => {
    expect(batchKey("2026-09", ["2", "1"])).toBe(batchKey("2026-09", ["1", "2"]));
  });

  it("різний склад дає різний ключ, а не той самий номер", () => {
    expect(batchKey("2026-09", ["1", "2"])).not.toBe(batchKey("2026-09", ["1", "2", "3"]));
  });
});

describe("дроблення вікна", () => {
  it("ділить місяць навпіл без втраченого дня", () => {
    expect(splitRange("2026-09-01", "2026-09-30")).toEqual({
      left: ["2026-09-01", "2026-09-15"],
      right: ["2026-09-16", "2026-09-30"],
    });
  });

  it("відмовляється від перевернутого вікна", () => {
    expect(() => splitRange("2026-09-30", "2026-09-01")).toThrow();
  });
});

describe("розбиття набору", () => {
  it("ріже громаду на пачки не більші за стелю джерела", () => {
    const parts = chunk(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], 10);
    expect(parts.map((part) => part.length)).toEqual([10, 2]);
  });

  it("відмовляється від нульового розміру", () => {
    expect(() => chunk(["1"], 0)).toThrow();
  });
});
