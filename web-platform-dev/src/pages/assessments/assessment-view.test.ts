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
import {
  GAD_7,
  WHO_5,
  exceedsAttention,
  maxRawScore,
  type AssessmentRecord,
} from "@wwwuabot/shared/assessments";
import {
  blockedReason,
  latestByTest,
  profileReading,
  thresholdLine,
  trendFrom,
  trendLabel,
} from "./assessment-view";

/**
 * Результат із потрібним відсотком; порядок id — «свіжіший перший», як віддає
 * сервер. `raw` рахується з відсотка, бо екран тепер читає межу уваги саме з
 * нього: тест-заглушка з `raw: 0` при 80% виглядав би як «нуль балів».
 */
const at = (id: number, percent: number, testKey = WHO_5.key): AssessmentRecord => {
  const test = testKey === GAD_7.key ? GAD_7 : WHO_5;
  const raw = Math.round((percent / 100) * maxRawScore(test));
  return {
    id,
    testKey,
    answers: [],
    raw,
    percent,
    bandKey: "middle",
    needsAttention: exceedsAttention(test, raw),
    createdAt: "2026-09-01 10:00:00",
  };
};

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

describe("трактування профілю", () => {
  const withAnswers = (answers: number[], percent: number) => ({
    ...at(1, percent),
    answers,
    raw: answers.reduce((a, b) => a + b, 0),
  });

  it("називає конкретну сферу, а не «рівень загалом»", () => {
    // 4,4,4,1,4 — відпочинок провалився, решта тримається.
    const text = profileReading(WHO_5, withAnswers([4, 4, 4, 1, 4], 80));
    expect(text.weakest).toContain("Відпочинок");
    expect(text.strongest).toContain("Міцніше:");
  });

  it("задає питання до найслабшої сфери — це і є зміст розділу", () => {
    expect(profileReading(WHO_5, withAnswers([4, 4, 4, 1, 4], 80)).question).toContain(
      "Сон є, але не відновлює",
    );
  });

  describe("коли всі сфери рівні", () => {
    it("називає обраний варіант — це конкретно, а не «рівний стан»", () => {
      // Регресія: рівний профіль повертав опис даних і жодного питання —
      // тобто нуль трактування там, де людина чекала пояснення.
      const text = profileReading(WHO_5, withAnswers([4, 4, 4, 4, 4], 80));
      expect(text.strongest).toContain("«Майже завжди»");
    });

    it("питання лишається навіть тоді, коли розкиду немає", () => {
      expect(profileReading(WHO_5, withAnswers([4, 4, 4, 4, 4], 80)).question).toBeTruthy();
      expect(profileReading(WHO_5, withAnswers([1, 1, 1, 1, 1], 20)).question).toBeTruthy();
    });

    it("рівний низький — це не те саме, що рівний високий", () => {
      const high = profileReading(WHO_5, withAnswers([4, 4, 4, 4, 4], 80));
      const low = profileReading(WHO_5, withAnswers([1, 1, 1, 1, 1], 20));
      expect(high.weakest).not.toBe(low.weakest);
      expect(low.weakest).toContain("Просило не одне, а все одразу");
    });
  });
});

describe("поріг уваги", () => {
  it("перекладає 50 зі 100 у бали своєї шкали", () => {
    expect(thresholdLine(WHO_5, at(1, 80))).toContain("Поріг уваги — 12 із 25");
  });

  it("поріг шкали симптомів — це 10 балів, а не 10 відсотків", () => {
    // Регресія: поріг переводився з відсотка, тож для GAD-7 (21 бал) виходило
    // «поріг 2 із 21» — число, без якого людина з нулем тривоги не розуміє
    // нічого. Правильна відповідь — та сама 10 зі специфікації, у балах.
    expect(thresholdLine(GAD_7, { ...at(1, 0, GAD_7.key), testKey: GAD_7.key })).toContain(
      "Поріг уваги — 10 із 21",
    );
  });

  it("не звірить масштаб у стилі шкали ВООЗ", () => {
    // Регресія: «50 зі 100» — це мова джерела, а не людини, що відповідала
    // на «майже завжди».
    const line = thresholdLine(WHO_5, at(1, 80));
    expect(line).toContain("вище за ним");
    expect(line).not.toContain("зі 100");
  });
});

describe("рівний результат на шкалі симптомів", () => {
  const gad = (value: number, percent: number) => ({
    ...at(1, percent),
    testKey: "gad7",
    answers: new Array(7).fill(value).concat(0),
    raw: value * 7,
  });

  it("нуль тривоги — це «нічого не турбувало», а не «важко скрізь»", () => {
    // Регресія: напрямок шкали ігнорувався, і людина з GAD-7 = 0 читала
    // «просило не одне, а все одразу» — прямо протилежне її результату.
    const text = profileReading(GAD_7, gad(0, 0));
    expect(text.strongest).toContain("Ніщо не турбувало");
    expect(text.weakest).toContain("Жодна сфера не піднялася вище нуля");
    expect(text.question).toBeNull();
  });

  it("а от коли симптоми є скрізь — тоді справді «важко не з однієї сторони»", () => {
    const text = profileReading(GAD_7, gad(3, 100));
    expect(text.weakest).toContain("Піднялося не одне, а все одразу");
    expect(text.question).toBeTruthy();
  });

  it("благополуччя лишається зі своєю логікою рівного профілю", () => {
    const even = [4, 4, 4, 4, 4];
    const text = profileReading(WHO_5, { ...at(1, 80), answers: even, raw: 20 });
    expect(text.strongest).toContain("Усі п'ять сфер тримаються рівно");
  });
});
