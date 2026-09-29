/**
 * Сторожі екрана самооцінки.
 *
 * Перевіряється те, що читає людина про себе: напрям зміни та чи вона
 * значуща. Число само по собі нікуди не більше за рядок у базі — сенс дає
 * порівняння, а воно ламається тихо.
 *
 * @module web-platform-dev/src/pages/assessments/assessment-view.test
 */

import { describe, expect, it } from "vitest";
import { WHO_5, type AssessmentRecord } from "@wwwuabot/shared/assessments";
import { latestByTest, trendFrom, trendLabel } from "./assessment-view";

/** Результат із потрібним балом; порядок id — «свіжіший перший», як віддає сервер. */
const at = (id: number, percent: number, testKey = WHO_5.key): AssessmentRecord => ({
  id,
  testKey,
  answers: [],
  raw: 0,
  percent,
  bandKey: "middle",
  needsAttention: percent <= 50,
  createdAt: "2026-09-01 10:00:00",
});

describe("останній результат", () => {
  it("бере перший у списку: сервер уже відсортував новіші спершу", () => {
    const latest = latestByTest([at(3, 60), at(2, 40), at(1, 20)]);
    expect(latest.get(WHO_5.key)?.id).toBe(3);
  });

  it("тести не змішуються між собою", () => {
    const latest = latestByTest([at(1, 30, "who5"), at(2, 70, "other")]);
    expect(latest.get("who5")?.percent).toBe(30);
    expect(latest.get("other")?.percent).toBe(70);
  });
});

describe("тренд", () => {
  it("без попереднього результату тренду немає — і це не «без змін»", () => {
    const trend = trendFrom([at(1, 48)], WHO_5);
    expect(trend.hasPrevious).toBe(false);
    expect(trendLabel(trend)).toBeNull();
  });

  it("без жодного результату тренду теж немає", () => {
    expect(trendFrom([], WHO_5).hasPrevious).toBe(false);
  });

  it("вищий бал — це «краще», бо wellbeing зростає", () => {
    const trend = trendFrom([at(2, 52), at(1, 48)], WHO_5);
    expect(trend.direction).toBe("up");
    expect(trend.delta).toBe(4);
  });

  it("різниця 4% — коливання, а не зміна", () => {
    expect(trendFrom([at(2, 52), at(1, 48)], WHO_5).significant).toBe(false);
    expect(trendLabel(trendFrom([at(2, 52), at(1, 48)], WHO_5))).toBe("краще незначно");
  });

  it("різниця 10% — вже значуща зміна", () => {
    const trend = trendFrom([at(2, 60), at(1, 50)], WHO_5);
    expect(trend.significant).toBe(true);
    expect(trendLabel(trend)).toBe("краще (10)");
  });

  it("падіння читається як «гірше», а не як мінус у дужках", () => {
    const trend = trendFrom([at(2, 40), at(1, 60)], WHO_5);
    expect(trend.direction).toBe("down");
    expect(trendLabel(trend)).toBe("гірше (20)");
  });

  it("одинакові бали — «без змін», і це не твердження про значущість", () => {
    const trend = trendFrom([at(2, 50), at(1, 50)], WHO_5);
    expect(trend.direction).toBe("flat");
    expect(trend.significant).toBe(false);
    expect(trendLabel(trend)).toBe("без змін");
  });

  it("порівнює два останні, а не найкращий і найгірший", () => {
    const trend = trendFrom([at(3, 52), at(2, 48), at(1, 20)], WHO_5);
    expect(trend.delta).toBe(4);
  });
});
