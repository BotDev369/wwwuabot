import { describe, it, expect } from "vitest";
import { formatDay, formatSqliteDatetime } from "./datetime";

describe("formatSqliteDatetime", () => {
  it("formats current date into SQLite timestamp when called without arguments", () => {
    const result = formatSqliteDatetime();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(result.length).toBe(19);
    expect(result[10]).toBe(" ");
  });

  it("formats a specific date correctly into YYYY-MM-DD HH:MM:SS", () => {
    const fixed = new Date("2026-09-04T15:30:45.123Z");
    const result = formatSqliteDatetime(fixed);
    expect(result).toBe("2026-09-04 15:30:45");
  });

  it("correctly handles leap year date (Feb 29)", () => {
    const leapDay = new Date("2024-02-29T23:59:59.000Z");
    expect(formatSqliteDatetime(leapDay)).toBe("2024-02-29 23:59:59");
  });

  it("correctly handles year boundary and midnight", () => {
    const midnight = new Date("2025-01-01T00:00:00.000Z");
    expect(formatSqliteDatetime(midnight)).toBe("2025-01-01 00:00:00");
  });

  it("trims milliseconds and timezone indicators (no T or Z or period)", () => {
    const date = new Date("2026-12-31T23:59:59.999Z");
    const formatted = formatSqliteDatetime(date);
    expect(formatted).not.toContain("T");
    expect(formatted).not.toContain("Z");
    expect(formatted).not.toContain(".");
    expect(formatted).toBe("2026-12-31 23:59:59");
  });
});

describe("formatDay", () => {
  it("показує дату без часу", () => {
    // Час тут — шум: у рядку «з нами з …» дата події, а не сама подія.
    expect(formatDay("2026-09-18 09:30:00")).toBe("18.09.2026");
    expect(formatDay("2026-09-18 09:30:00")).not.toContain(":");
  });

  it("розбирає час тим самим правилом, що `formatStamp` — UTC без позначки зони", () => {
    // Другий розбір того самого рядка показував би іншу дату: північ UTC
    // частина рушіїв читає як попередній день.
    expect(formatDay("2025-01-01 00:00:00")).toBe("01.01.2025");
  });

  it("розуміє і ISO — у частині рядків (`users.created_at`) час лежить саме так", () => {
    // Саме цей випадок і зламався на живому екрані: `2026-06-23T07:36:31.070Z`
    // не розбиралось і показувалось людині як є — сирою стрічкою.
    expect(formatDay("2026-06-23T07:36:31.070Z")).toBe("23.06.2026");
    expect(formatDay("2026-06-23T07:36:31.070Z")).not.toContain("T");
  });

  it("невалідне значення лишає як є, а не вигадує дату", () => {
    expect(formatDay("")).toBe("");
    expect(formatDay("не дата")).toBe("не дата");
  });
});
