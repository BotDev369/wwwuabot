import { describe, it, expect } from "vitest";
import { formatSessionExpiry, parseUserIdInput } from "./session-format";

describe("formatSessionExpiry", () => {
  const now = new Date("2026-09-14T18:00:00").getTime();

  it("показує час, коли сесія ще діє", () => {
    const inTwoHours = now + 2 * 60 * 60 * 1000;
    expect(formatSessionExpiry(inTwoHours, now)).toMatch(/^до \d{2}:\d{2}$/);
  });

  it("минулий термін називає минулим, а не робочим станом", () => {
    expect(formatSessionExpiry(now - 1000, now)).toBe("термін минув — потрібен новий вхід");
  });

  it("невідомий термін — «невідомо»", () => {
    expect(formatSessionExpiry(null, now)).toBe("невідомо");
    expect(formatSessionExpiry(Number.NaN, now)).toBe("невідомо");
  });
});

describe("parseUserIdInput", () => {
  it("приймає ID з пробілами навколо", () => {
    expect(parseUserIdInput(" 123456789 ")).toBe(123456789);
  });

  it("відхиляє порожнє, дробове, від'ємне й текст", () => {
    expect(parseUserIdInput("")).toBeNull();
    expect(parseUserIdInput("12.5")).toBeNull();
    expect(parseUserIdInput("-5")).toBeNull();
    expect(parseUserIdInput("abc")).toBeNull();
    expect(parseUserIdInput("0")).toBeNull();
  });
});
