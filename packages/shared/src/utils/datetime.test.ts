import { describe, it, expect } from "vitest";
import { formatSqliteDatetime } from "./datetime";

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
