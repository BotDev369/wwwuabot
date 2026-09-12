import { describe, expect, it } from "vitest";
import { decodePathSegment } from "./url";

describe("decodePathSegment", () => {
  it("декодує коректний сегмент", () => {
    expect(decodePathSegment(encodeURIComponent("мої дати"))).toBe("мої дати");
  });

  it("лишає звичайний сегмент як є", () => {
    expect(decodePathSegment("my-dates")).toBe("my-dates");
  });

  it("декодує `%25` у відсоток, а не в помилку", () => {
    expect(decodePathSegment("%25")).toBe("%");
  });

  it.each(["%", "%zz", "%E0%A4%A", "abc%"])("повертає null на битому кодуванні: %s", (raw) => {
    expect(decodePathSegment(raw)).toBeNull();
  });
});
