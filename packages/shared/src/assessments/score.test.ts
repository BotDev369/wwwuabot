/**
 * Сторожі рахування самооцінки.
 *
 * Тут ламається те, що читає людина: не «чи працює сума», а **межі** — що не
 * стане валідною відповіддю і що стане результатом. Бо помилка в рахунку
 * тут — це не баг екрана, а неправильне твердження про стан конкретної людини.
 *
 * **Одиниця рахунку — шкала.** У тесті «Тревожність і депресія» їх дві, тому
 * рахунок приходить списком, а кожна смуга перевіряється на своїй шкалі:
 * 21 бал тривоги й 21 бал настрою — різні речі.
 *
 * @module @wwwuabot/shared/assessments/score.test
 */

import { describe, expect, it } from "vitest";
import {
  isSignificantChange,
  maxRawScore,
  profileOf,
  scoreAssessment,
  scoreScale,
  validateAnswers,
  type ScaleResult,
} from "./score";
import { MOOD_ANXIETY } from "./mood_anxiety";
import { WHO_5 } from "./who5";
import type { AssessmentScale, AssessmentTest } from "./types";

/** Шкала за індексом — кидає, якщо тест раптом не той (тоді тест не наш). */
function scaleAt(test: AssessmentTest, index: number): AssessmentScale {
  const scale = test.scales[index];
  if (!scale) throw new Error(`У тесті «${test.key}» немає шкали № ${index}`);
  return scale;
}

/** Тест з однією шкалою мусить її назвати — так само, як тест із двома. */
const wellbeing = scaleAt(WHO_5, 0);
const mood = scaleAt(MOOD_ANXIETY, 0);
const anxiety = scaleAt(MOOD_ANXIETY, 1);

/** Відповіді однакові на всі питання — так рахунок виходить передбачуваним. */
const all = (value: number): number[] => WHO_5.items.map(() => value);

/** Рахунок однієї шкали з результату проходження. */
const only = (result: readonly ScaleResult[]): ScaleResult => result[0] as ScaleResult;

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
  it("найбільший бал — це питання шкали помножені на найбільший бал шкали", () => {
    expect(maxRawScore(WHO_5, wellbeing)).toBe(25);
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
    for (let raw = 0; raw <= maxRawScore(WHO_5, wellbeing); raw += 1) {
      const hits = wellbeing.bands.filter((band) => raw >= band.min && raw <= band.max);
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

  it("спільне питання про вплив перевіряється за своєю шкалою", () => {
    // Регресія: спільна перевірка за `test.options` пропустила б відповідь, яка
    // належить іншому питанню, тож у сумі з'явилися б чужі бали. У даних
    // обидві шкали збігаються (0–3), тому звужуємо самі варіанти впливу —
    // інакше тест нікого не відрізняв би від випадку.
    const narrow = {
      ...MOOD_ANXIETY,
      impact: {
        ...(MOOD_ANXIETY.impact as NonNullable<typeof MOOD_ANXIETY.impact>),
        options: [{ value: 0, label: "Зовсім не ускладнили" }],
      },
    };
    const answers = MOOD_ANXIETY.items.map(() => 0);
    const last = answers.length - 1;
    answers[last] = 1;
    expect(validateAnswers(MOOD_ANXIETY, answers)).toBeNull();
    expect(validateAnswers(narrow, answers)).toContain("поза шкалою");
  });
});

describe("рахунок", () => {
  it("«завжди» на кожному питанні — 100", () => {
    expect(only(scoreAssessment(WHO_5, all(5)).scales)).toMatchObject({
      raw: 25,
      percent: 100,
      needsAttention: false,
    });
  });

  it("«ніколи» на кожному питанні — 0 і найнижча смуга", () => {
    const result = only(scoreAssessment(WHO_5, all(0)).scales);
    expect(result).toMatchObject({ raw: 0, percent: 0, needsAttention: true });
    expect(result.band.key).toBe("very-low");
  });

  it("рахунок завжди кратний 4: шкала з кроком 1 на п'яти питаннях", () => {
    // Тому поріг 50 недосяжний — важлива межа лежить між 48 і 52.
    for (let raw = 0; raw <= 25; raw += 1) {
      expect(scoreScale(WHO_5, wellbeing, answersSummingTo(raw)).percent).toBe(raw * 4);
    }
  });

  it("розподіл по питаннях не міняє суми", () => {
    for (let raw = 0; raw <= 25; raw += 1) {
      expect(scoreScale(WHO_5, wellbeing, answersSummingTo(raw)).raw).toBe(raw);
    }
  });

  it("рахує кожну шкалу окремо, у своїх одиницях", () => {
    // Регресія проти сумісання блоків: 12 настрою — це 12 з 27, а 12 тривоги —
    // те саме число з 21, тож у відсотках вони вже різні речі.
    const answers = MOOD_ANXIETY.items.map(() => 0);
    answers[0] = 3;
    answers[1] = 3;
    answers[2] = 3;
    answers[3] = 3;
    answers[9] = 3;
    answers[10] = 3;
    answers[11] = 3;
    const result = scoreAssessment(MOOD_ANXIETY, answers);
    expect(result.scales.map((one) => [one.scale.key, one.raw, one.percent])).toEqual([
      ["mood", 12, 44],
      ["anxiety", 9, 43],
    ]);
  });
});

describe("поріг уваги", () => {
  it("48 — ще в зоні уваги, 52 — вже ні", () => {
    // 12 і 13 балів — сусідні досяжні суми навколо підтвердженого порогу 50.
    expect(scoreAssessment(WHO_5, [3, 3, 2, 2, 2]).scales[0]?.percent).toBe(48);
    expect(only(scoreAssessment(WHO_5, [3, 3, 2, 2, 2]).scales).needsAttention).toBe(true);

    expect(scoreAssessment(WHO_5, [3, 3, 3, 2, 2]).scales[0]?.percent).toBe(52);
    expect(only(scoreAssessment(WHO_5, [3, 3, 3, 2, 2]).scales).needsAttention).toBe(false);
  });

  it("поріг не змінюється з боку: він у даних шкали, а не в коді", () => {
    // 12 із 25 — це 48%, найближча досяжна сума до підтверджених 50 зі 100.
    expect(wellbeing.attentionRaw).toBe(12);
  });

  it("шкали симптомів: увага починається з 10 балів, а не з 10%", () => {
    expect(mood.attentionRaw).toBe(10);
    expect(anxiety.attentionRaw).toBe(10);
    const answers = MOOD_ANXIETY.items.map(() => 0);
    for (const index of [0, 1, 2]) answers[index] = 3;
    answers[3] = 1;
    // 3+3+3+1 = 10 настрою: увага вже так; без останнього одиниці — 9, ще ні.
    expect(only(scoreAssessment(MOOD_ANXIETY, answers).scales).raw).toBe(10);
    expect(only(scoreAssessment(MOOD_ANXIETY, answers).scales).needsAttention).toBe(true);
    answers[3] = 0;
    expect(only(scoreAssessment(MOOD_ANXIETY, answers).scales).needsAttention).toBe(false);
  });

  it("прапор про проходження — один на обидва блоки, а не на кожен", () => {
    // Людина з 12 за настрій і 12 за тривогу мусить побачити попередження
    // один раз; двійка з блоків виглядала б як дві різні проблеми.
    const answers = MOOD_ANXIETY.items.map((_item, index) =>
      [0, 1, 2, 3, 9, 10, 11, 12].includes(index) ? 3 : 0,
    );
    const result = scoreAssessment(MOOD_ANXIETY, answers);
    expect(result.scales.map((one) => one.raw)).toEqual([12, 12]);
    expect(result.scales.filter((one) => one.needsAttention)).toHaveLength(2);
    expect(result.needsAttention).toBe(true);
  });

  it("один блок без уваги не робить прапор на все проходження", () => {
    const answers = MOOD_ANXIETY.items.map((_item, index) => (index < 4 ? 3 : 0));
    const result = scoreAssessment(MOOD_ANXIETY, answers);
    expect(result.scales[0]?.needsAttention).toBe(true);
    expect(result.scales[1]?.needsAttention).toBe(false);
    expect(result.needsAttention).toBe(true);
  });
});

describe("значуща зміна", () => {
  it("різниця рівно у 10% — вже значуща", () => {
    expect(isSignificantChange(50, 55, wellbeing)).toBe(true);
  });

  it("менша за 10% — ще ні", () => {
    expect(isSignificantChange(50, 54, wellbeing)).toBe(false);
  });

  it("зміна вниз теж рахується", () => {
    expect(isSignificantChange(80, 70, wellbeing)).toBe(true);
  });

  it("від нуля будь-який рух значний — інакше поділ на нуль", () => {
    expect(isSignificantChange(0, 4, wellbeing)).toBe(true);
  });

  it("шкали симптомів вимірюють зміну в балах, а не у відсотках", () => {
    // Регресія проти одного `%` для всіх: 5 балів із 27 — це 19%, але в
    // літературі значуща зміна PHQ-9 — це саме 5 балів.
    expect(mood.significantChange).toEqual({ kind: "points", value: 5 });
    expect(isSignificantChange(30, 25, mood)).toBe(true);
    expect(isSignificantChange(30, 26, mood)).toBe(false);
    expect(anxiety.significantChange).toEqual({ kind: "points", value: 4 });
  });
});

describe("профіль по сферах", () => {
  it("знаходить найслабшу і найсильнішу сферу", () => {
    const { weakest, strongest } = profileOf(WHO_5, wellbeing, [5, 5, 5, 1, 5]);
    expect(weakest.label).toBe("Відпочинок");
    expect(strongest.label).toBe("Інтерес");
  });

  it("max — найвищий бал шкали, а не довжина масиву", () => {
    const { weakest } = profileOf(WHO_5, wellbeing, [5, 5, 5, 5, 5]);
    expect(weakest.max).toBe(5);
  });

  it("коли всі рівні — найсильшої випадково не вибирає", () => {
    // Регресія: без цієї перевірки «найсильніше» мало б випадково впасти на
    // перший елемент — і людина прочитала б це як відкриття, а не як рівність.
    const { even, strongest, weakest } = profileOf(WHO_5, wellbeing, [3, 3, 3, 3, 3]);
    expect(even).toBe(true);
    // Найсильніша не випадкова: обидва поля — та сама сфера.
    expect(strongest.id).toBe(weakest.id);
  });

  it("профіль рахується всередині шкали, а не по всьому тесту", () => {
    // Регресія проти сумісання блоків: «сон» — це 0 із настрою, але порівнювати
    // його з «неспокієм» тривоги без спільної шкали — це порівняння тепло з
    // довжиною, і найслабшою сферою видно б чужу відповідь.
    const answers = MOOD_ANXIETY.items.map(() => 3);
    answers[2] = 0;
    answers[9] = 3;
    const profile = profileOf(MOOD_ANXIETY, mood, answers);
    expect(profile.weakest.label).toBe("Сон");
    expect(profile.weakest.value).toBe(0);
  });

  it("питання про вплив на життя не потрапляє у профіль", () => {
    // Регресія: вплив = 0 («нічого не ускладнило») ставав «найслабшою
    // сферою», хоча він міряє наслідок, а не симптом.
    const answers = MOOD_ANXIETY.items.map(() => 3);
    answers[answers.length - 1] = 0;
    const profile = profileOf(MOOD_ANXIETY, anxiety, answers);
    expect(profile.weakest.label).not.toBe("Вплив на життя");
    expect(profile.weakest.value).toBe(3);
  });

  it("неповні відповіді кидають, а не мовчать", () => {
    // Без перевірки `answers[index]` тихо став би нулем, і профіль людини, яка
    // відповіла на половину, виглядав би як профіль із відповідями «нічого».
    expect(() => profileOf(WHO_5, wellbeing, [1, 2])).toThrow(/5/);
  });
});

/**
 * **Кожна можлива сума має потрапити в смугу своєї шкали.**
 *
 * Регресія на змішування одиниць: смуги PHQ-9 і GAD-7 задані в балах (5–9,
 * 10–14), а `bandFor` шукала їх у відсотках. Тоді 17 із 22 сум тривоги і 20 із
 * 28 сум настрою не потрапляли ні в одну смугу — і результат **не зберігався
 * взагалі**: людина проходила тест до кінця й отримувала помилку.
 *
 * Тест навмисно йде по всіх сумах, а не по кількох прикладах: рівний розподіл
 * «по одному рядку на смугу» не помітив би, що смуги накладаються чи
 * прогалина між ними.
 */
describe("кожна сума потрапляє в смугу своєї шкали", () => {
  const cases: readonly {
    name: string;
    test: AssessmentTest;
    scale: AssessmentScale;
    step: number;
  }[] = [
    { name: "Тривога", test: MOOD_ANXIETY, scale: anxiety, step: 3 },
    { name: "Настрій", test: MOOD_ANXIETY, scale: mood, step: 3 },
    { name: "WHO-5", test: WHO_5, scale: wellbeing, step: 5 },
  ];

  for (const { name, test, scale, step } of cases) {
    it(`${name}: від нуля до максимуму без падінь і з правильною смугою`, () => {
      const max = maxRawScore(test, scale);
      const bands = [...scale.bands].sort((a, b) => a.min - b.min);
      for (let raw = 0; raw <= max; raw += 1) {
        const answers: number[] = [];
        let left = raw;
        for (const { index, item } of test.items
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.scale === scale.key)) {
          const take = item.countsTowardScore === false ? 0 : Math.min(step, left);
          answers[index] = take;
          left -= take;
        }
        const result = scoreScale(test, scale, answers);
        expect(result.raw, `${name}, сума ${raw}`).toBe(raw);
        const expected = bands.find((band) => raw >= band.min && raw <= band.max);
        expect(result.band.key, `${name}, сума ${raw}`).toBe(expected?.key);
      }
    });
  }

  it("смуги не перекриваються й не мають прогалин", () => {
    for (const { name, test, scale } of cases) {
      const sorted = [...scale.bands].sort((a, b) => a.min - b.min);
      expect(sorted[0]?.min, name).toBe(0);
      expect(sorted[sorted.length - 1]?.max, name).toBe(maxRawScore(test, scale));
      sorted.forEach((band, index) => {
        if (index === 0) return;
        // Наступна смуга має починатися рівно за попередньою: щільність
        // рівно +1 виключає і накладання, і діру, через яку сума губиться.
        const previous = sorted[index - 1];
        expect(band.min, `${name}: ${previous?.key} → ${band.key}`).toBe((previous?.max ?? -1) + 1);
      });
    }
  });
});
