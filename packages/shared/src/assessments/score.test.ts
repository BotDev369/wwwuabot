/**
 * Сторожі рахування самооцінки.
 *
 * Тут ламається те, що читає людина: не «чи працює сума», а **межі** — що не
 * стане валідною відповіддю і що стане результатом. Бо помилка в рахунку
 * тут — це не баг екрана, а неправильне твердження про стан конкретної людини.
 *
 * @module @wwwuabot/shared/assessments/score.test
 */

import { describe, expect, it } from "vitest";
import {
  isSignificantChange,
  maxRawScore,
  profileOf,
  scoreAssessment,
  validateAnswers,
} from "./score";
import { GAD_7 } from "./gad7";
import { PHQ_9 } from "./phq9";
import { WHO_5 } from "./who5";

/** Відповіді однакові на всі питання — так рахунок виходить передбачуваним. */
const all = (value: number): number[] => WHO_5.items.map(() => value);

/** Розкладає потрібну суму по питаннях, не виходячи за межі шкали (0–5). */
function answersSummingTo(raw: number): number[] {
  const answers: number[] = [];
  let left = raw;
  for (let index = 0; index < WHO_5.items.length; index += 1) {
    const take = Math.min(5, left);
    answers.push(take);
    left -= take;
  }
  return answers;
}

describe("шкала тесту", () => {
  it("найбільший бал — це питання помножені на найбільший бал шкали", () => {
    expect(maxRawScore(WHO_5)).toBe(25);
  });

  it("шкала спадає від «завжди» до «ніколи» і не має дірок", () => {
    const values = WHO_5.options.map((option) => option.value);
    expect(values).toEqual([5, 4, 3, 2, 1, 0]);
  });

  it("питань п'ять, і в кожному є текст", () => {
    expect(WHO_5.items).toHaveLength(5);
    for (const item of WHO_5.items) expect(item.text.length).toBeGreaterThan(0);
  });
});

describe("смуги покривають усю шкалу", () => {
  it("кожен бал від 0 до 25 потрапляє рівно в одну смугу", () => {
    // **Бали, а не відсотки.** Смуги живуть у тій самій одиниці, що й сума:
    // змішування двох одиниць уже коштувало результатів, які не зберігалися.
    for (let raw = 0; raw <= maxRawScore(WHO_5); raw += 1) {
      const hits = WHO_5.bands.filter((band) => raw >= band.min && raw <= band.max);
      expect(hits, `бал ${raw}`).toHaveLength(1);
    }
  });
});

describe("відповіді", () => {
  it("повний набір приймається", () => {
    expect(validateAnswers(WHO_5, all(3))).toBeNull();
  });

  it("недописана форма — каже, скільки запитань лишилося", () => {
    const problem = validateAnswers(WHO_5, [3, 4]);
    expect(problem).toContain("5");
    expect(problem).toContain("2");
  });

  it("значення поза шкалою — не приймається, навіть якщо воно ціле", () => {
    expect(validateAnswers(WHO_5, [3, 4, 5, 0, 6])).toContain("поза шкалою");
    expect(validateAnswers(WHO_5, [3, 4, 5, 0, -1])).toContain("поза шкалою");
  });

  it("дробове значення — теж не відповідь", () => {
    expect(validateAnswers(WHO_5, [3, 4, 5, 0, 2.5])).toContain("поза шкалою");
  });
});

describe("рахунок", () => {
  it("«завжди» на кожному питанні — 100", () => {
    const result = scoreAssessment(WHO_5, all(5));
    expect(result).toMatchObject({ raw: 25, percent: 100, needsAttention: false });
  });

  it("«ніколи» на кожному питанні — 0 і найнижча смуга", () => {
    const result = scoreAssessment(WHO_5, all(0));
    expect(result).toMatchObject({ raw: 0, percent: 0, needsAttention: true });
    expect(result.band.key).toBe("very-low");
  });

  it("рахунок завжди кратний 4: шкала з кроком 1 на п'яти питаннях", () => {
    // Тому поріг 50 недосяжний — важлива межа лежить між 48 і 52.
    for (let raw = 0; raw <= 25; raw += 1) {
      expect(scoreAssessment(WHO_5, answersSummingTo(raw)).percent).toBe(raw * 4);
    }
  });

  it("розподіл по питаннях не міняє суму", () => {
    for (let raw = 0; raw <= 25; raw += 1) {
      expect(scoreAssessment(WHO_5, answersSummingTo(raw)).raw).toBe(raw);
    }
  });
});

describe("поріг уваги", () => {
  it("48 — ще в зоні уваги, 52 — вже ні", () => {
    // 12 і 13 балів — сусідні досяжні суми навколо підтвердженого порогу 50.
    expect(scoreAssessment(WHO_5, [3, 3, 2, 2, 2]).percent).toBe(48);
    expect(scoreAssessment(WHO_5, [3, 3, 2, 2, 2]).needsAttention).toBe(true);

    expect(scoreAssessment(WHO_5, [3, 3, 3, 2, 2]).percent).toBe(52);
    expect(scoreAssessment(WHO_5, [3, 3, 3, 2, 2]).needsAttention).toBe(false);
  });

  it("поріг не змінюється з боку: він у даних тесту, а не в коді", () => {
    // 12 із 25 — це 48%, найближча досяжна сума до підтверджених 50 зі 100.
    expect(WHO_5.attentionRaw).toBe(12);
  });

  it("шкали симптомів: увага починається з 10 балів, а не з 10%", () => {
    expect(PHQ_9.attentionRaw).toBe(10);
    expect(GAD_7.attentionRaw).toBe(10);
    // 9 балів — ще не увага, 10 — вже так (3+3+3+1 і 3+3+3).
    expect(scoreAssessment(PHQ_9, [3, 3, 3, 1, 0, 0, 0, 0, 0, 0]).raw).toBe(10);
    expect(scoreAssessment(PHQ_9, [3, 3, 3, 1, 0, 0, 0, 0, 0, 0]).needsAttention).toBe(true);
    expect(scoreAssessment(PHQ_9, [3, 3, 3, 0, 0, 0, 0, 0, 0, 0]).needsAttention).toBe(false);
  });
});

describe("значуща зміна", () => {
  it("різниця рівно у 10% — вже значуща", () => {
    expect(isSignificantChange(50, 55, WHO_5)).toBe(true);
  });

  it("менша за 10% — ще ні", () => {
    expect(isSignificantChange(50, 54, WHO_5)).toBe(false);
  });

  it("зміна вниз теж рахується", () => {
    expect(isSignificantChange(80, 70, WHO_5)).toBe(true);
  });

  it("від нуля будь-який рух значний — інакше поділ на нуль", () => {
    expect(isSignificantChange(0, 4, WHO_5)).toBe(true);
  });
});

describe("профіль по сферах", () => {
  it("знаходить найслабшу і найсильнішу сферу", () => {
    const { weakest, strongest } = profileOf(WHO_5, [5, 5, 5, 1, 5]);
    expect(weakest.label).toBe("Відпочинок");
    expect(strongest.label).toBe("Інтерес");
  });

  it("max — найвищий бал шкали, а не довжина масиву", () => {
    const { weakest } = profileOf(WHO_5, [5, 5, 5, 5, 5]);
    expect(weakest.max).toBe(5);
  });

  it("коли всі рівні — найсильшої випадково не вибирає", () => {
    // Регресія: без цієї перевірки «найсильніше» мало б випадково впасти на
    // перший елемент — і людина прочитала б це як відкриття, а не як рівність.
    const { even, strongest, weakest } = profileOf(WHO_5, [3, 3, 3, 3, 3]);
    expect(even).toBe(true);
    // Найсильніша не випадкова: обидва поля — та сама сфера.
    expect(strongest.id).toBe(weakest.id);
  });

  it("питання про вплив на життя не потрапляє у профіль", () => {
    // Регресія: вплив = 0 («нічого не ускладнило») ставав «найслабшою
    // сферою», хоча він міряє наслідок, а не симптом.
    const withImpact = profileOf(GAD_7, [3, 3, 3, 3, 3, 3, 3, 0]);
    expect(withImpact.weakest.label).not.toBe("Вплив на життя");
    expect(withImpact.weakest.value).toBe(3);
  });

  it("неповні відповіді кидають, а не мовчать", () => {
    expect(() => profileOf(WHO_5, [1, 2])).toThrow(/повними відповідями/);
  });
});

/**
 * **Кожна можлива сума має потрапити в смугу.**
 *
 * Регресія на змішування одиниць: смуги PHQ-9 і GAD-7 задані в балах (5–9,
 * 10–14), а `bandFor` шукала їх у відсотках. Тоді 17 із 22 сум GAD-7 і 20 із
 * 28 сум PHQ-9 не потрапляли ні в одну смугу — і результат **не зберігався
 * взагалі**: людина проходила тест до кінця й отримувала помилку.
 *
 * Тест навмисно йде по всіх сумах, а не по кількох прикладах: рівний розподіл
 * «по одному рядку на смугу» не помітив би, що смуги накладаються чи
 * прогалина між ними.
 */
describe("кожна сума потрапляє в смугу", () => {
  const cases = [
    { name: "GAD-7", test: GAD_7, scored: 7, step: 3 },
    { name: "PHQ-9", test: PHQ_9, scored: 9, step: 3 },
    { name: "WHO-5", test: WHO_5, scored: 5, step: 5 },
  ] as const;

  for (const { name, test, scored, step } of cases) {
    it(`${name}: від нуля до максимуму без падінь і з правильною смугою`, () => {
      const max = maxRawScore(test);
      const bands = [...test.bands].sort((a, b) => a.min - b.min);
      for (let raw = 0; raw <= max; raw += 1) {
        const answers: number[] = [];
        let left = raw;
        for (let index = 0; index < test.items.length; index += 1) {
          const take = test.items[index].countsTowardScore === false ? 0 : Math.min(step, left);
          answers.push(take);
          left -= take;
        }
        const result = scoreAssessment(test, answers);
        expect(result.raw, `${name}, сума ${raw}`).toBe(raw);
        const expected = bands.find((band) => raw >= band.min && raw <= band.max);
        expect(result.band.key, `${name}, сума ${raw}`).toBe(expected?.key);
      }
    });
  }

  it("смуги не перекриваються й не мають прогалин", () => {
    for (const { name, test } of cases) {
      const sorted = [...test.bands].sort((a, b) => a.min - b.min);
      expect(sorted[0].min, name).toBe(0);
      expect(sorted[sorted.length - 1].max, name).toBe(maxRawScore(test));
      sorted.forEach((band, index) => {
        if (index === 0) return;
        // Наступна смуга має починатися рівно за попередньою: щільність
        // рівно +1 виключає і накладання, і діру, через яку сума губиться.
        expect(band.min, `${name}: ${sorted[index - 1].key} → ${band.key}`).toBe(
          sorted[index - 1].max + 1,
        );
      });
    }
  });
});
