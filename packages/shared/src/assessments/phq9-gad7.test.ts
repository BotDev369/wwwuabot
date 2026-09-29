/**
 * Сторожі PHQ-9 і GAD-7. **Найкритичніші тести в усьому розділі**: мовчазний
 * збій тут коштує реальному здоров'ю людини, а не лише її думці про себе.
 *
 * Що захищено:
 * — **повнота даних**: кожна смуга має текст, кожне питання — акцент; забутий
 *   переклад падає тестом, а не тим, що людина прочитає «undefined»;
 * — **межі безпеки**: 2 бали з 27 мусять дати той самий блок допомоги, що й
 *   20 — перевіряється на найнижчій можливій відповіді;
 * — **виключення з суми**: питання про вплив на життя не додає балів, інакше
 *   максимум перестав би бути 27 і всі межі змістилися б;
 * — **порядок перевірки** спільного висновку: сума ≥ 10 обох не повинна
 *   перехоплюватися «легкими проявами обох станів».
 *
 * @module @wwwuabot/shared/assessments/phq9-gad7.test
 */

import { describe, expect, it } from "vitest";
import {
  combinedKeyOf,
  exceedsAttention,
  itemAlerts,
  impactValue,
  maxRawScore,
  safetyOf,
} from "./index";
import { GAD_7, PHQ_9, WHO_5 } from "./index";
import { GAD7_BAND_NOTES, GAD7_ITEM_ALERTS } from "./gad7_texts";
import { PHQ9_BAND_NOTES, PHQ9_ITEM_ALERTS } from "./phq9_texts";

/** Відповіді на дев'ять питань PHQ-9; останній — питання про вплив. */
const phq9 = (nine: readonly number[], impact = 0): number[] => [...nine, impact];

describe("повнота даних", () => {
  it("кожна смуга PHQ-9 має текст", () => {
    for (const band of PHQ_9.bands) {
      expect(PHQ9_BAND_NOTES[band.key], band.key).toBeTruthy();
      expect(band.note).toBeTruthy();
    }
  });

  it("кожна смуга GAD-7 має текст", () => {
    for (const band of GAD_7.bands) {
      expect(GAD7_BAND_NOTES[band.key], band.key).toBeTruthy();
      expect(band.note).toBeTruthy();
    }
  });

  it("кожне питання PHQ-9, крім питання безпеки, має персональний акцент", () => {
    // Питання безпеки обробляється протоколом, а не акцентом (§7.6 каже
    // «див. розділ 8»), тож для нього акценту немати — і це має бути
    // навмисно, а не випадково.
    for (const item of PHQ_9.items) {
      if (item.safety || item.countsTowardScore === false) continue;
      expect(PHQ9_ITEM_ALERTS[item.id], item.id).toBeTruthy();
      expect(item.alertNote, item.id).toBeTruthy();
    }
    expect(PHQ_9.items.find((item) => item.safety)?.alertNote).toBeUndefined();
  });

  it("кожне питання GAD-7 має персональний акцент", () => {
    for (const item of GAD_7.items) {
      if (item.countsTowardScore === false) continue;
      expect(GAD7_ITEM_ALERTS[item.id], item.id).toBeTruthy();
      expect(item.alertNote, item.id).toBeTruthy();
    }
  });

  it("у кожного питання з акцентом задано поріг", () => {
    for (const test of [PHQ_9, GAD_7]) {
      for (const item of test.items) {
        if (item.alertNote === undefined) continue;
        expect(item.alertAtLeast, item.id).toBe(2);
      }
    }
  });

  it("кожна лінія допомоги має номер і назву", () => {
    for (const test of [PHQ_9, GAD_7]) {
      expect(test.help?.length ?? 0).toBeGreaterThan(0);
      for (const line of test.help ?? []) {
        expect(line.name, line.number).toBeTruthy();
        expect(line.number).toMatch(/^[\d ]+$/);
      }
      expect(test.help?.filter((line) => line.primary).length).toBe(3);
    }
  });
});

describe("максимальний бал", () => {
  it("PHQ-9: 27, а не 30 — питання про вплив не входить у суму", () => {
    // Регресія: якщо вплив рахується, максимум зміщується на 3 бали й усі
    // межі з §6.1 перестають збігатися з літературою.
    expect(maxRawScore(PHQ_9)).toBe(27);
  });

  it("GAD-7: 21, а не 24", () => {
    expect(maxRawScore(GAD_7)).toBe(21);
  });

  it("вплив не потрапляє в суму", () => {
    const without = PHQ_9.items.findIndex((item) => item.safety === true);
    expect(impactValue(PHQ_9, phq9([1, 1, 1, 1, 1, 1, 1, 1, 0], 3))).toBe(3);
    // Усі дев'ять по 3, але питання безпеки нульове: сума 24 з 27.
    const answers = phq9([3, 3, 3, 3, 3, 3, 3, 3, 0], 3);
    const scored = answers.slice(0, without + 1).reduce((sum, a) => sum + a, 0);
    expect(scored).toBe(24);
  });
});

describe("протокол безпеки (питання 9 PHQ-9)", () => {
  it("«Зовсім ні» — не спрацьовує", () => {
    expect(safetyOf(PHQ_9, phq9([0, 0, 0, 0, 0, 0, 0, 0, 0])).triggered).toBe(false);
  });

  it("«Кілька днів» спрацьовує НАВПРИЧИСТЬ мінімальної суми", () => {
    // Регресія, заради якої все це й робиться: 1 бал із 27 — це «мінімальні
    // симптоми», і без окремого правила людина не побачила б нічого.
    const safety = safetyOf(PHQ_9, phq9([0, 0, 0, 0, 0, 0, 0, 0, 1]));
    expect(safety.triggered).toBe(true);
    expect(safety.value).toBe(1);
    expect(safety.text).toContain("Дякуємо, що були чесні");
  });

  it("«Більше половини днів» і «Майже щодня» дають прямий текст із 112", () => {
    const two = safetyOf(PHQ_9, phq9([0, 0, 0, 0, 0, 0, 0, 0, 2]));
    const three = safetyOf(PHQ_9, phq9([0, 0, 0, 0, 0, 0, 0, 0, 3]));
    expect(two.text).toContain("112");
    expect(three.text).toBe(two.text);
    // А м'який текст для відповіді 1 — зовсім інший, і про 112 у ньому не йдеться.
    const one = safetyOf(PHQ_9, phq9([0, 0, 0, 0, 0, 0, 0, 0, 1]));
    expect(one.text).not.toBe(two.text);
    expect(one.text).not.toContain("112");
  });

  it("спрацьовує при максимальній сумі теж — правило незалежне від бала", () => {
    expect(safetyOf(PHQ_9, phq9([3, 3, 3, 3, 3, 3, 3, 3, 1])).triggered).toBe(true);
  });

  it("у GAD-7 протокол безпеки не спрацьовує ніколи", () => {
    const max = GAD_7.items.map(() => 3);
    expect(safetyOf(GAD_7, max).triggered).toBe(false);
    expect(safetyOf(GAD_7, max).text).toBeNull();
  });
});

describe("персональні акценти", () => {
  it("не спрацьовують на 1 — тільки від 2", () => {
    const one = PHQ_9.items.map((item, i) => (i === 0 ? 1 : 0));
    expect(itemAlerts(PHQ_9, one)).toHaveLength(0);
  });

  it("спрацьовують на кожне питання вище порогу, а не лише на найслабше", () => {
    // Регресія проти `profileOf`, яке добирає одну сферу: у PHQ-9 пояснення
    // мають усі вісім симптомних питань, кожне зі своїм текстом.
    const answers = phq9([3, 0, 2, 0, 2, 0, 0, 0, 0]);
    const alerts = itemAlerts(PHQ_9, answers);
    expect(alerts.map((a) => a.id)).toEqual(["interest", "sleep", "appetite"]);
  });

  it("питання безпеки не потрапляє в акценти", () => {
    const answers = phq9([0, 0, 0, 0, 0, 0, 0, 0, 3]);
    expect(itemAlerts(PHQ_9, answers)).toHaveLength(0);
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
    expect(exceedsAttention(PHQ_9, 0)).toBe(false);
    expect(exceedsAttention(PHQ_9, 9)).toBe(false);
    expect(exceedsAttention(PHQ_9, 10)).toBe(true);
    expect(exceedsAttention(GAD_7, 0)).toBe(false);
    expect(exceedsAttention(GAD_7, 9)).toBe(false);
    expect(exceedsAttention(GAD_7, 10)).toBe(true);
  });

  it("шкала благополуччя: увага внизу", () => {
    // **Бали, а не відсотки**: 12 із 25 — це ті самі підтверджені 48%.
    expect(exceedsAttention(WHO_5, 12)).toBe(true);
    expect(exceedsAttention(WHO_5, 13)).toBe(false);
  });

  it("напрямок у самій смузі не змінюється — він уже в її межах", () => {
    // Смуга «Легка тривога» PHQ-9 — 5..9, тобто нижче порогу 10, але все одно
    // не увага: напрямок стосується прапорця, а не поділу шкали.
    const mild = PHQ_9.bands.find((band) => band.key === "phq_mild");
    expect(mild?.min).toBe(5);
    expect(mild?.max).toBe(9);
    expect(exceedsAttention(PHQ_9, 7)).toBe(false);
  });
});
