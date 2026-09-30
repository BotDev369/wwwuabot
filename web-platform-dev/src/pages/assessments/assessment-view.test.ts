/**
 * Сторожі екрана самооцінки.
 *
 * Перевіряється те, що читає людина про себе: напрям зміни та чи вона
 * значуща. Число само по собі нікуди не більше за рядок у базі — сенс дає
 * порівняння, а воно ламається тихо.
 *
 * **Тест із двома шкалами — головний випадок цього файлу.** «Тревожність і
 * депресія» має дві шкали, тому тут перевіряється, що тренд, профіль і поріг
 * рахуються **окремо для кожної**: спільна історія двох шкал у одному списку
 * ламалася б так, що людина бачила б тривогу поруч із настроєм і порівнювала б
 * їхні відсотки, наче це одна шкала.
 *
 * @module web-platform-dev/src/pages/assessments/assessment-view.test
 */

import { describe, expect, it } from "vitest";
import {
  MOOD_ANXIETY,
  WHO_5,
  exceedsAttention,
  maxRawScore,
  type AssessmentRecord,
  type AssessmentScale,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";
import {
  blockedReason,
  latestByScale,
  profileReading,
  thresholdLine,
  trendFrom,
  trendLabel,
} from "./assessment-view";

/** Шкала за ключем — тести мають говорити про конкретну шкалу, а не про тест. */
function scaleOf(test: AssessmentTest, key: string): AssessmentScale {
  const found = test.scales.find((scale) => scale.key === key);
  if (!found) throw new Error(`Немає шкали ${key}`);
  return found;
}

const WHO = WHO_5.scales[0];
const MOOD = scaleOf(MOOD_ANXIETY, "mood");
const ANXIETY = scaleOf(MOOD_ANXIETY, "anxiety");

/**
 * Результат із потрібним відсотком; порядок id — «свіжіший перший», як віддає
 * сервер. `raw` рахується з відсотка, бо екран читає межу уваги саме з нього:
 * тест-заглушка з `raw: 0` при 80% виглядав би як «нуль балів».
 */
const at = (
  id: number,
  percent: number,
  test: AssessmentTest,
  scale: AssessmentScale,
): AssessmentRecord => {
  const raw = Math.round((percent / 100) * maxRawScore(test, scale));
  return {
    id,
    testKey: test.key,
    scaleKey: scale.key,
    answers: [],
    raw,
    percent,
    bandKey: "middle",
    needsAttention: exceedsAttention(scale, raw),
    createdAt: "2026-09-01 10:00:00",
  };
};

describe("останній результат", () => {
  it("бере перший у списку: сервер уже відсортував новіші спершу", () => {
    const latest = latestByScale([
      at(3, 60, WHO_5, WHO),
      at(2, 40, WHO_5, WHO),
      at(1, 20, WHO_5, WHO),
    ]);
    expect(latest.get(`${WHO_5.key}:${WHO.key}`)?.id).toBe(3);
  });

  it("шкали одного тесту не змішуються між собою", () => {
    // Регресія: список без ключа шкали брав «перший у списку», тож настрій
    // і тривога показували б один бал замість двох.
    const latest = latestByScale([
      at(1, 30, MOOD_ANXIETY, MOOD),
      at(2, 70, MOOD_ANXIETY, ANXIETY),
      at(3, 10, WHO_5, WHO),
    ]);
    expect(latest.get(`${MOOD_ANXIETY.key}:${MOOD.key}`)?.percent).toBe(30);
    expect(latest.get(`${MOOD_ANXIETY.key}:${ANXIETY.key}`)?.percent).toBe(70);
    expect(latest.get(`${WHO_5.key}:${WHO.key}`)?.percent).toBe(10);
  });
});

describe("тренд", () => {
  it("без попереднього результату тренду немає — і це не «без змін»", () => {
    const trend = trendFrom([at(1, 48, WHO_5, WHO)], WHO_5, WHO);
    expect(trend.hasPrevious).toBe(false);
    expect(trendLabel(trend)).toBeNull();
  });

  it("без жодного результату тренду теж немає", () => {
    expect(trendFrom([], WHO_5, WHO).hasPrevious).toBe(false);
  });

  it("вищий бал — це «краще», бо wellbeing зростає", () => {
    const trend = trendFrom([at(2, 52, WHO_5, WHO), at(1, 48, WHO_5, WHO)], WHO_5, WHO);
    expect(trend.direction).toBe("up");
    expect(trend.delta).toBe(4);
  });

  it("різниця 4% — коливання, а не зміна", () => {
    expect(trendFrom([at(2, 52, WHO_5, WHO), at(1, 48, WHO_5, WHO)], WHO_5, WHO).significant).toBe(
      false,
    );
    expect(trendLabel(trendFrom([at(2, 52, WHO_5, WHO), at(1, 48, WHO_5, WHO)], WHO_5, WHO))).toBe(
      "краще незначно",
    );
  });

  it("різниця 10% — вже значуща зміна", () => {
    expect(trendFrom([at(2, 60, WHO_5, WHO), at(1, 50, WHO_5, WHO)], WHO_5, WHO).significant).toBe(
      true,
    );
    expect(trendLabel(trendFrom([at(2, 60, WHO_5, WHO), at(1, 50, WHO_5, WHO)], WHO_5, WHO))).toBe(
      "краще (10)",
    );
  });

  it("падіння читається як «гірше», а не як мінус у дужках", () => {
    expect(trendLabel(trendFrom([at(2, 40, WHO_5, WHO), at(1, 60, WHO_5, WHO)], WHO_5, WHO))).toBe(
      "гірше (20)",
    );
  });

  it("одинакові бали — «без змін», і це не твердження про значущість", () => {
    const trend = trendFrom([at(2, 50, WHO_5, WHO), at(1, 50, WHO_5, WHO)], WHO_5, WHO);
    expect(trend.direction).toBe("flat");
    expect(trend.significant).toBe(false);
    expect(trendLabel(trend)).toBe("без змін");
  });

  it("порівнює два останні, а не найкращий і найгірший", () => {
    const trend = trendFrom(
      [at(3, 52, WHO_5, WHO), at(2, 48, WHO_5, WHO), at(1, 20, WHO_5, WHO)],
      WHO_5,
      WHO,
    );
    expect(trend.delta).toBe(4);
  });

  it("шкали одного тесту не ділять історію: тренд тривоги не сідає на тренд настрою", () => {
    // Регресія, через яку на екрані з'явилося б «гірше (40)» у шкалі, де
    // такого руку ніколи не було: 60% тривоги поруч із 10% настрою.
    const records = [at(2, 60, MOOD_ANXIETY, ANXIETY), at(1, 10, MOOD_ANXIETY, MOOD)];
    expect(trendFrom(records, MOOD_ANXIETY, ANXIETY).hasPrevious).toBe(false);
    expect(trendFrom(records, MOOD_ANXIETY, ANXIETY).delta).toBe(0);
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

  it("питання про вплив перевіряється за своєю шкалою, а не за симптомною", () => {
    // Регресія: спільна перевірка за `test.options` пропустила б відповідь, яка
    // на питанні про вплив не існує, — і сервер потім відкидав би увесь
    // результат як помилковий. У даних обидві шкали збігаються (0–3), тому
    // звужуємо самі варіанти впливу: інакше тест нікого не відрізняє.
    const impactStep = MOOD_ANXIETY.items.findIndex((item) => item.countsTowardScore === false);
    expect(impactStep).toBeGreaterThan(0);
    const narrow = {
      ...MOOD_ANXIETY,
      impact: {
        ...(MOOD_ANXIETY.impact as NonNullable<typeof MOOD_ANXIETY.impact>),
        options: [{ value: 0, label: "Зовсім не ускладнили" }],
      },
    };
    const answerAt = (value: number) => {
      const answers = new Array<number>(impactStep).fill(0);
      answers[impactStep] = value;
      return answers;
    };
    expect(blockedReason(MOOD_ANXIETY, answerAt(3), impactStep)).toBeNull();
    expect(blockedReason(narrow, answerAt(3), impactStep)).not.toBeNull();
  });
});

describe("трактування профілю", () => {
  const withAnswers = (answers: number[], percent: number, test = WHO_5, scale = WHO) => ({
    ...at(1, percent, test, scale),
    answers,
    raw: answers.reduce((a, b) => a + b, 0),
  });

  it("називає конкретну сферу, а не «рівень загалом»", () => {
    const text = profileReading(WHO_5, WHO, withAnswers([4, 4, 4, 1, 4], 80));
    expect(text.weakest).toContain("Відпочинок");
    expect(text.strongest).toContain("Міцніше:");
  });

  it("задає питання до найслабшої сфери — це і є зміст розділу", () => {
    expect(profileReading(WHO_5, WHO, withAnswers([4, 4, 4, 1, 4], 80)).question).toContain(
      "Сон є, але не відновлює",
    );
  });

  describe("коли всі сфери рівні", () => {
    it("називає обраний варіант — це конкретно, а не «рівний стан»", () => {
      const text = profileReading(WHO_5, WHO, withAnswers([4, 4, 4, 4, 4], 80));
      expect(text.strongest).toContain("«Майже завжди»");
    });

    it("питання лишається навіть тоді, коли розкиду немає", () => {
      expect(profileReading(WHO_5, WHO, withAnswers([4, 4, 4, 4, 4], 80)).question).toBeTruthy();
      expect(profileReading(WHO_5, WHO, withAnswers([1, 1, 1, 1, 1], 20)).question).toBeTruthy();
    });

    it("рівний низький — це не те саме, що рівний високий", () => {
      const high = profileReading(WHO_5, WHO, withAnswers([4, 4, 4, 4, 4], 80));
      const low = profileReading(WHO_5, WHO, withAnswers([1, 1, 1, 1, 1], 20));
      expect(high.weakest).not.toBe(low.weakest);
      expect(low.weakest).toContain("Просило не одне, а все одразу");
    });
  });
});

describe("поріг уваги", () => {
  it("перекладає 50 зі 100 у бали своєї шкали", () => {
    expect(thresholdLine(WHO_5, WHO, at(1, 80, WHO_5, WHO))).toContain("Поріг уваги — 12 із 25");
  });

  it("поріг шкали симптомів — це 10 балів, а не 10 відсотків", () => {
    // Регресія: поріг переводився з відсотка, тож для шкали тривоги (21 бал)
    // виходило «поріг 2 з 21» — число, без якого людина з нулем тривоги не
    // розуміє нічого.
    expect(thresholdLine(MOOD_ANXIETY, ANXIETY, at(1, 0, MOOD_ANXIETY, ANXIETY))).toContain(
      "Поріг уваги — 10 із 21",
    );
  });

  it("не звірить масштаб у стилі шкали ВООЗ", () => {
    const line = thresholdLine(WHO_5, WHO, at(1, 80, WHO_5, WHO));
    expect(line).toContain("вище за ним");
    expect(line).not.toContain("зі 100");
  });
});

describe("рівний результат на шкалі симптомів", () => {
  const anxiety = (value: number, percent: number) => ({
    ...at(1, percent, MOOD_ANXIETY, ANXIETY),
    // Нулі настрою, однакові відповіді тривоги, спільне питання про вплив.
    answers: new Array(9).fill(0).concat(new Array(7).fill(value), 0),
    raw: value * 7,
  });

  it("нуль тривоги — це «нічого не турбувало», а не «важко скрізь»", () => {
    // Регресія: напрямок шкали ігнорувався, і людина з нулем тривоги читала
    // «просило не одне, а все одразу» — прямо протилежне її результату.
    const text = profileReading(MOOD_ANXIETY, ANXIETY, anxiety(0, 0));
    expect(text.strongest).toContain("Ніщо не турбувало");
    expect(text.weakest).toContain("Жодна сфера не піднялася вище нуля");
    expect(text.question).toBeNull();
  });

  it("а от коли симптоми є скрізь — тоді справді «важко не з однієї сторони»", () => {
    const text = profileReading(MOOD_ANXIETY, ANXIETY, anxiety(3, 100));
    expect(text.weakest).toContain("Піднялося не одне, а все одразу");
    expect(text.question).toBeTruthy();
  });

  it("благополуччя лишається зі своєю логікою рівного профілю", () => {
    const even = [4, 4, 4, 4, 4];
    const text = profileReading(WHO_5, WHO, { ...at(1, 80, WHO_5, WHO), answers: even, raw: 20 });
    expect(text.strongest).toContain("Усі сфери тримаються рівно");
  });

  it("профіль рахується в межах шкали: питання іншого блоку не потрапляють у розкид", () => {
    // Регресія: `profileOf` рахував по всьому тесту, тож «Слабше» у блоці
    // тривоги могло назвати питання з блоку настрою — порівняння без спільної
    // шкали.
    const records = {
      ...at(1, 50, MOOD_ANXIETY, ANXIETY),
      // Сім «3» у тривозі (21 бал) і нулі настрою — різниця має називати
      // тривожні сфери, а не настрою.
      answers: [3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      raw: 21,
    };
    const text = profileReading(MOOD_ANXIETY, ANXIETY, records);
    for (const label of ["Настрій", "Сон", "Апетит"]) {
      expect(text.strongest + text.weakest, label).not.toContain(label);
    }
  });
});
