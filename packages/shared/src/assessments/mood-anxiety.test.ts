/**
 * Сторожі «Тревожності і депресії» — одного тесту з двома шкалами.
 * **Найкритичніші тести в усьому розділі**: мовчазний збій тут коштує
 * реальному здоров'ю людини, а не лише її думці про себе.
 *
 * Що захищено:
 * — **повнота даних**: кожна смуга обох шкал має текст, кожне питання — акцент;
 * — **межі безпеки**: 2 бали з 27 мусять дати той самий блок допомоги, що й
 *   20 — перевіряється на найнижчій можливій відповіді;
 * — **виключення з суми**: питання про вплив на життя не додає балів у жодній
 *   шкалі, інакше максимуми перестали б бути 27 і 21;
 * — **порядок перевірки** спільного висновку: сума ≥ 10 обох не повинна
 *   перехоплюватися «легкими проявами обох станів».
 *
 * @module @wwwuabot/shared/assessments/mood-anxiety.test
 */

import { describe, expect, it } from "vitest";
import { combinedKeyOf } from "./combined";
import {
  MOOD_ANXIETY,
  WHO_5,
  exceedsAttention,
  impactValue,
  itemAlerts,
  maxRawScore,
  safetyOf,
  scaleByKey,
  startsScale,
} from "./index";
import { ANXIETY_ITEM_ALERTS, ANXIETY_BAND_NOTES } from "./anxiety_texts";
import { ANXIETY_ITEMS, ANXIETY_SCALE_KEY, MOOD_ITEMS, MOOD_SCALE_KEY } from "./mood_anxiety_items";
import { MOOD_BAND_NOTES, MOOD_ITEM_ALERTS, SAFETY_HIGH, SAFETY_LOW } from "./mood_texts";
import type { AssessmentScale, AssessmentTest } from "./types";

/** Шкала тесту за ключем — кидає, якщо ключа немає (тоді тест не той). */
function scaleOf(test: AssessmentTest, key: string): AssessmentScale {
  const scale = scaleByKey(test, key);
  if (!scale) throw new Error(`Немає шкали «${key}» у тесті «${test.key}»`);
  return scale;
}

const mood = scaleOf(MOOD_ANXIETY, MOOD_SCALE_KEY);
const anxiety = scaleOf(MOOD_ANXIETY, ANXIETY_SCALE_KEY);

/**
 * Повний набір відповідей на все проходження: дев'ять настрою, сім тривоги й
 * спільне питання про вплив. Недостачі доповнюються нулями, тож тест читається
 * як «ці питання answered, решта — ні».
 */
function answerSet(
  moodValues: readonly number[] = [],
  anxietyValues: readonly number[] = [],
  impact = 0,
) {
  const block = (values: readonly number[], size: number): number[] =>
    [...values, ...new Array<number>(Math.max(0, size - values.length)).fill(0)].slice(0, size);
  return [
    ...block(moodValues, MOOD_ITEMS.length),
    ...block(anxietyValues, ANXIETY_ITEMS.length),
    impact,
  ];
}

describe("повнота даних", () => {
  it("кожна смуга обох шкал має текст", () => {
    for (const band of mood.bands) {
      expect(MOOD_BAND_NOTES[band.key], band.key).toBeTruthy();
      expect(band.note, band.key).toBeTruthy();
    }
    for (const band of anxiety.bands) {
      expect(ANXIETY_BAND_NOTES[band.key], band.key).toBeTruthy();
      expect(band.note, band.key).toBeTruthy();
    }
  });

  it("кожне питання, крім питання безпеки, має персональний акцент", () => {
    // Питання безпеки обробляється протоколом, а не акцентом (§7.6 каже
    // «див. розділ 8»), тож для нього акценту немає — і це має бути навмисно.
    for (const item of MOOD_ANXIETY.items) {
      if (item.scale === undefined) continue;
      if (item.safety) {
        expect(item.alertNote, item.id).toBeUndefined();
        continue;
      }
      const source = item.scale === MOOD_SCALE_KEY ? MOOD_ITEM_ALERTS : ANXIETY_ITEM_ALERTS;
      expect(source[item.id], item.id).toBeTruthy();
      expect(item.alertNote, item.id).toBeTruthy();
    }
  });

  it("у кожного питання з акцентом задано поріг 2", () => {
    for (const item of MOOD_ANXIETY.items) {
      if (item.alertNote === undefined) continue;
      expect(item.alertAtLeast, item.id).toBe(2);
    }
  });

  it("кожна лінія допомоги має номер і назву, три — основні", () => {
    expect(MOOD_ANXIETY.help?.length ?? 0).toBeGreaterThan(0);
    for (const line of MOOD_ANXIETY.help ?? []) {
      expect(line.name, line.number).toBeTruthy();
      expect(line.number).toMatch(/^[\d ]+$/);
    }
    expect(MOOD_ANXIETY.help?.filter((line) => line.primary)).toHaveLength(3);
  });

  it("обидва інструменти мають своє джерело", () => {
    // Один тест — два незалежні автори й дві ліцензії, тому `sources` масив.
    expect(MOOD_ANXIETY.sources).toHaveLength(2);
    for (const source of MOOD_ANXIETY.sources) {
      expect(source.citation, source.name).toBeTruthy();
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.license, source.name).toBeTruthy();
    }
  });
});

describe("структура проходження", () => {
  it("дев'ять питань настрою, сім тривоги й одне спільне про вплив", () => {
    expect(MOOD_ITEMS).toHaveLength(9);
    expect(ANXIETY_ITEMS).toHaveLength(7);
    expect(MOOD_ANXIETY.items).toHaveLength(17);
  });

  it("кожне питання належить рівно одній шкалі, а спільне — жодній", () => {
    const byScale = MOOD_ANXIETY.items.filter((item) => item.scale === mood.key);
    const byAnxiety = MOOD_ANXIETY.items.filter((item) => item.scale === anxiety.key);
    const shared = MOOD_ANXIETY.items.filter((item) => item.scale === undefined);
    expect(byScale).toHaveLength(9);
    expect(byAnxiety).toHaveLength(7);
    // Питання про вплив без ключа потрапило б у перший блок випадково.
    expect(shared.map((item) => item.id)).toEqual(["impact"]);
  });

  it("межі блоків видно один раз — на першому питанні кожного", () => {
    const starts = MOOD_ANXIETY.items.map((_item, index) => startsScale(MOOD_ANXIETY, index));
    expect(starts.filter(Boolean)).toHaveLength(2);
    expect(startsScale(MOOD_ANXIETY, 0)).toBe(true);
    expect(startsScale(MOOD_ANXIETY, 8)).toBe(false);
    expect(startsScale(MOOD_ANXIETY, 9)).toBe(true);
    // Спільне питання — не початок блока.
    expect(startsScale(MOOD_ANXIETY, 16)).toBe(false);
  });
});

describe("максимальний бал", () => {
  it("настрій: 27, тривога: 21 — питання про вплив не входить у суму", () => {
    // Регресія: якщо вплив рахується, максимуми зміщуються на 3 бали й усі межі
    // з §6.1 і §6.2 перестають збігатися з літературою.
    expect(maxRawScore(MOOD_ANXIETY, mood)).toBe(27);
    expect(maxRawScore(MOOD_ANXIETY, anxiety)).toBe(21);
  });

  it("вплив не потрапляє ні в одну суму", () => {
    // Усі дев'ять настрою по 3, але питання безпеки нульове: сума 24 з 27.
    const answers = answerSet(
      [3, 3, 3, 3, 3, 3, 3, 3, 0],
      ANXIETY_ITEMS.map(() => 3),
      3,
    );
    expect(impactValue(MOOD_ANXIETY, answers)).toBe(3);
  });
});

describe("протокол безпеки (питання безпеки в блоці настрою)", () => {
  it("«Зовсім ні» — не спрацьовує", () => {
    expect(safetyOf(MOOD_ANXIETY, answerSet()).triggered).toBe(false);
  });

  it("«Кілька днів» спрацьовує НАВПРИЧИСТЬ мінімальної суми", () => {
    // Регресія, заради якої все це й робиться: 1 бал із 27 — це «мінімальні
    // симптоми», і без окремого правила людина не побачила б нічого.
    const safety = safetyOf(MOOD_ANXIETY, answerSet([0, 0, 0, 0, 0, 0, 0, 0, 1]));
    expect(safety.triggered).toBe(true);
    expect(safety.value).toBe(1);
    expect(safety.text).toBe(SAFETY_LOW);
  });

  it("«Більше половини днів» і «Майже щодня» дають прямий текст із 112", () => {
    const two = safetyOf(MOOD_ANXIETY, answerSet([0, 0, 0, 0, 0, 0, 0, 0, 2]));
    const three = safetyOf(MOOD_ANXIETY, answerSet([0, 0, 0, 0, 0, 0, 0, 0, 3]));
    expect(two.text).toBe(SAFETY_HIGH);
    expect(two.text).toContain("112");
    expect(three.text).toBe(two.text);
    // А м'який текст зовсім інший, і про 112 у ньому не йдеться.
    expect(SAFETY_LOW).not.toContain("112");
  });

  it("спрацьовує при максимальній сумі теж — правило незалежне від бала", () => {
    expect(safetyOf(MOOD_ANXIETY, answerSet([3, 3, 3, 3, 3, 3, 3, 3, 1])).triggered).toBe(true);
  });

  it("у блоці тривоги протокол безпеки не спрацьовує ніколи", () => {
    const max = ANXIETY_ITEMS.map(() => 3);
    expect(safetyOf(MOOD_ANXIETY, answerSet([], max)).triggered).toBe(false);
    expect(safetyOf(MOOD_ANXIETY, answerSet([], max)).text).toBeNull();
  });
});

describe("персональні акценти", () => {
  it("не спрацьовують на 1 — тільки від 2", () => {
    expect(itemAlerts(MOOD_ANXIETY, mood, answerSet([1, 0, 0, 0, 0, 0, 0, 0, 0]))).toHaveLength(0);
  });

  it("спрацьовують на кожне питання вище порогу, а не лише на найслабше", () => {
    // Регресія проти `profileOf`, яке добирає одну сферу: пояснення мають усі
    // вісім симптомних питань настрою, кожне зі своїм текстом.
    const answers = answerSet([3, 0, 2, 0, 2, 0, 0, 0, 0]);
    expect(itemAlerts(MOOD_ANXIETY, mood, answers).map((a) => a.id)).toEqual([
      "interest",
      "sleep",
      "appetite",
    ]);
  });

  it("акценти не змішуються між шкалами", () => {
    // Максимум тривоги не має права виглядати як акцент блоку настрою.
    const answers = answerSet(
      [],
      ANXIETY_ITEMS.map(() => 3),
    );
    expect(itemAlerts(MOOD_ANXIETY, mood, answers)).toHaveLength(0);
    expect(itemAlerts(MOOD_ANXIETY, anxiety, answers)).toHaveLength(7);
  });

  it("питання безпеки не потрапляє в акценти", () => {
    const answers = answerSet([0, 0, 0, 0, 0, 0, 0, 0, 3]);
    expect(itemAlerts(MOOD_ANXIETY, mood, answers)).toHaveLength(0);
  });
});

describe("спільний висновок за двома шкалами (§7.5)", () => {
  it("12 і 11 — це comorbid, а не «легкі прояви»", () => {
    // Порядок перевірки заданий специфікацією: обидва ≥ 10 перевіряються перед
    // діапазоном 5–9, інакше людина з 23 балами прочитала б заспокійливе.
    expect(combinedKeyOf(12, 11)).toBe("comorbid");
  });

  it("переважає настрій, тривога, легкі обидва, низькі обидва, межа", () => {
    expect(combinedKeyOf(14, 3)).toBe("mood-dominant");
    expect(combinedKeyOf(2, 15)).toBe("anxiety-dominant");
    expect(combinedKeyOf(7, 8)).toBe("mild-both");
    expect(combinedKeyOf(1, 2)).toBe("low-both");
    expect(combinedKeyOf(6, 2)).toBe("border");
  });
});

describe("напрямок шкали", () => {
  it("шкала симптомів: увага вгорі, а не внизу", () => {
    // Регресія: `percent <= attentionBelow` вмикало прапор уваги на найкращому
    // результаті, і людина з нулем тривоги читала «потрібна розмова».
    for (const scale of [mood, anxiety]) {
      expect(exceedsAttention(scale, 0), scale.key).toBe(false);
      expect(exceedsAttention(scale, 9), scale.key).toBe(false);
      expect(exceedsAttention(scale, 10), scale.key).toBe(true);
    }
  });

  it("шкала благополуччя: увага внизу", () => {
    // **Бали, а не відсотки**: 12 із 25 — це ті самі підтверджені 48%.
    const wellbeing = scaleOf(WHO_5, WHO_5.scales[0]?.key ?? "");
    expect(exceedsAttention(wellbeing, 12)).toBe(true);
    expect(exceedsAttention(wellbeing, 13)).toBe(false);
  });

  it("напрямок у самій смузі не змінюється — він уже в її межах", () => {
    // Смуга «Легкі симптоми» — 5..9, тобто нижче порогу 10, але все одно не
    // увага: напрямок стосується прапорця, а не поділу шкали.
    const mild = mood.bands.find((band) => band.key === "phq_mild");
    expect(mild?.min).toBe(5);
    expect(mild?.max).toBe(9);
    expect(exceedsAttention(mood, 7)).toBe(false);
  });
});
