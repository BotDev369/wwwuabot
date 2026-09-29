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
import {
  blockedReason,
  latestByTest,
  profileReading,
  scaleReading,
  trendFrom,
  trendLabel,
} from "./assessment-view";

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

describe("кнопка «далі»", () => {
  const last = WHO_5.items.length - 1;

  it("на першому питанні без відповіді — заблоковано, і каже чому", () => {
    expect(blockedReason(WHO_5, [], 0)).toBe("Обери один із варіантів, щоб рухатись далі.");
  });

  it("одна відповідь з п'яти НЕ блокує кнопку", () => {
    // Регресія: «далі» перевіряло весь тест, тож на першому питанні з одним
    // обраним варіантом кнопка була сірою завжди — пройти тест було неможливо.
    expect(blockedReason(WHO_5, [2], 0)).toBeNull();
  });

  it("на останньому питанні те саме: важлива відповідь на нього, а не заповненість", () => {
    expect(blockedReason(WHO_5, [2, 3, 1, 4], last)).not.toBeNull();
    expect(blockedReason(WHO_5, [2, 3, 1, 4, 0], last)).toBeNull();
  });

  it("порожня відповідь посередині не рахується відповіддю", () => {
    expect(blockedReason(WHO_5, [2], 1)).not.toBeNull();
  });

  it("варіант поза шкалою не проходить", () => {
    expect(blockedReason(WHO_5, [99], 0)).toBe("Обраний варіант не належить цьому питанню.");
  });

  it("крок поза тестом не проходить мовчки", () => {
    expect(blockedReason(WHO_5, [2, 2, 2, 2, 2], WHO_5.items.length)).not.toBeNull();
  });
});

describe("пояснення числа", () => {
  // 19 з 25 -> 76 зі 100; поріг 50 зі 100 це 13 з 25 (12.5 округлюється).
  const record = at(1, 76);

  it("називає обидва числа, щоб жодне не виглядало помилкою", () => {
    const line = scaleReading(WHO_5, { ...record, raw: 19 });
    expect(line).toContain("19 з 25");
    expect(line).toContain("76 зі 100");
  });

  it("перекладає поріг у бали сирої шкали, а не лишає у відсотках", () => {
    // Регресія: «12.5 з 25» — це не число, а людина таке прочитати не може.
    expect(scaleReading(WHO_5, record)).toContain("13 з 25");
  });

  it("каже, вище чи нижче за поріг", () => {
    expect(scaleReading(WHO_5, { ...record, percent: 76 })).toContain("вище за порігом");
    expect(scaleReading(WHO_5, { ...record, percent: 48 })).toContain("нижче за порігом");
  });
});

describe("трактування профілю", () => {
  it("називає конкретну сферу, а не «рівень загалом»", () => {
    // 4,4,4,1,4 — відпочинок провалився, решта тримається.
    const text = profileReading(WHO_5, [4, 4, 4, 1, 4]);
    expect(text.weakest).toContain("Відпочинок");
    expect(text.strongest).toContain("Міцніше:");
  });

  it("задає питання до найслабшої сфери — це і є зміст розділу", () => {
    const text = profileReading(WHO_5, [4, 4, 4, 1, 4]);
    expect(text.question).toContain("Сон є, але не відновлює");
  });

  it("коли все рівно — не вигадує «найсильнішу» сферу", () => {
    const text = profileReading(WHO_5, [3, 3, 3, 3, 3]);
    expect(text.strongest).toContain("Усі сфери на одному рівні");
    expect(text.question).toBeNull();
  });
});
