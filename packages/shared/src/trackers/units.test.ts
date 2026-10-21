import { describe, expect, it } from "vitest";
import { TRACKER_LIMITS } from "./catalog";
import { TRACKER_UNIT_GROUPS, isTrackerUnit } from "./units";

describe("довідник одиниць", () => {
  it("групи спорідненості непорожні, ключі унікальні, одиниці влазять у межу форми", () => {
    expect(TRACKER_UNIT_GROUPS.length).toBeGreaterThan(1);
    const keys = TRACKER_UNIT_GROUPS.map((group) => group.key);
    expect(new Set(keys).size).toBe(keys.length);

    for (const group of TRACKER_UNIT_GROUPS) {
      expect(group.title.length).toBeGreaterThan(0);
      expect(group.units.length).toBeGreaterThan(0);
      for (const unit of group.units) {
        // Довідник не має права пропонувати те, що форма відкине жовтою рамкою.
        expect(unit.length).toBeLessThanOrEqual(TRACKER_LIMITS.unit);
        expect(unit).toBe(unit.trim());
      }
    }
  });

  it("час іде з часом: приклад довідника — саме споріднена група", () => {
    const time = TRACKER_UNIT_GROUPS.find((group) => group.key === "time");
    expect(time?.units).toEqual([
      "рік",
      "півроку",
      "квартал",
      "місяць",
      "півмісяця",
      "декада",
      "тиждень",
      "доба",
      "ніч",
      "день",
      "година",
      "хв",
      "сек",
    ]);
  });

  it("типова одиниця впізнається, своя — ні: вибір і ввід розрізняються", () => {
    expect(isTrackerUnit("хв")).toBe(true);
    expect(isTrackerUnit("кг")).toBe(true);
    expect(isTrackerUnit("чашок")).toBe(false);
    expect(isTrackerUnit("")).toBe(false);
  });
});
