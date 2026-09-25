/**
 * Тести підписів сторінки моніторингу.
 *
 * Смішні за обсягом, але саме вони тримають два рішення, які легко зламати
 * мовчки: «нейтральна зміна не фарбується» і «частковий зріз не виглядає як
 * повний». Обидва — про честність сторінки, а не про красу.
 *
 * @module web-admin-dev/src/pages/monitoring/format.test
 */

import { describe, expect, it } from "vitest";
import {
  collectorStatusLabel,
  deltaClass,
  formatDuration,
  shortRef,
  stampParts,
  statusClass,
  statusLabel,
  triggerLabel,
} from "./format";

describe("стан зрізу", () => {
  it("підписи не змішують частковий зріз із повним", () => {
    expect(statusLabel("ok")).toBe("повний");
    expect(statusLabel("partial")).toBe("частковий");
    expect(statusLabel("error")).toBe("невдалий");
  });

  it("колір відповідає станові", () => {
    expect(statusClass("ok")).toBe("mon-status-ok");
    expect(statusClass("partial")).toBe("mon-status-partial");
    expect(statusClass("error")).toBe("mon-status-error");
    expect(statusClass("skipped")).toBe("mon-status-partial");
  });

  it("підписи колекторів і збору", () => {
    expect(collectorStatusLabel("skipped")).toBe("пропущено");
    expect(triggerLabel("cron")).toBe("за розкладом");
    expect(triggerLabel("manual")).toBe("вручну");
  });
});

describe("зміна показника", () => {
  it("ріст фарбується зеленим лише там, де ріст — це добре", () => {
    expect(deltaClass("up", 5)).toBe("mon-kpi-delta--up");
    expect(deltaClass("neutral", 5)).toBe("mon-kpi-delta--flat");
  });

  it("падіння показника «більше — краще» червоне", () => {
    expect(deltaClass("up", -3)).toBe("mon-kpi-delta--down");
  });

  it("без зміни й без попереднього зрізу — нейтрально", () => {
    expect(deltaClass("up", 0)).toBe("mon-kpi-delta--flat");
    expect(deltaClass("up", undefined)).toBe("mon-kpi-delta--flat");
  });
});

describe("дрібниці", () => {
  it("короткий хеш коміту", () => {
    expect(shortRef("0123456789abcdef")).toBe("0123456");
    expect(shortRef(null)).toBe("—");
  });

  it("тривалість у мілісекундах і секундах", () => {
    expect(formatDuration(420)).toBe("420 мс");
    expect(formatDuration(2400)).toBe("2.4 с");
  });

  it("дата й час зрізу — двома рядками, а не одним", () => {
    const [date, time] = stampParts("2026-09-25T08:14:00.000Z");
    expect(date).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    expect(time).toMatch(/^\d{2}:\d{2}$/);
  });

  it("невідома дата не вигадує час", () => {
    expect(stampParts("не дата")).toEqual(["—", ""]);
  });
});
