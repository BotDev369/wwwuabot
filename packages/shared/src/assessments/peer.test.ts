/**
 * Розподіл між людьми: **рахуємо правильно там, де помиляється найлегше.**
 *
 * Три місця, де тут легко зробити тиху брехню, і кожне перевіряється окремо:
 *
 *  1. **Напрямок шкали.** WHO-5 — «більше = краще», шкала симптомів — «більше =
 *     гірше», а смуги в обох лежать у масиві від нуля. Розподіл, який просто
 *     відсортує за `min`, покаже людині зі шкалою симптомів найкращу смугу там,
 *     де вона в найгіршій.
 *  2. **Одна людина — один голос.** Голосує останній результат, а не
 *     останній рядок: п'ять проходжень однієї людини не повинні переважувати
 *     чотири інші.
 *  3. **Сума відсотків.** Вони мають давати рівно 100, інакше блок показує
 *     «18 + 22 + 24%» і сам себе заперечує.
 *
 * **Одиниця — шкала.** Розподіл рахується окремо для настрою й для тривоги:
 * одна лінійка на обидва блоки порівнювала б числа, які не порівнюються.
 *
 * @module @wwwuabot/shared/assessments/peer.test
 */

import { describe, expect, it } from "vitest";
import { MOOD_ANXIETY, WHO_5 } from "./index";
import { PEER_SMALL_SAMPLE, peerSnapshot, type PeerTally } from "./peer";
import type { AssessmentScale, AssessmentTest } from "./types";

/** Рахунок: скільки людей у кожній смузі. */
function tally(people: Record<string, number>): PeerTally {
  return people;
}

/** Шкала за індексом — кидає, якщо тест раптом не той. */
function scaleAt(test: AssessmentTest, index: number): AssessmentScale {
  const scale = test.scales[index];
  if (!scale) throw new Error(`У тесті «${test.key}» немає шкали № ${index}`);
  return scale;
}

const wellbeing = scaleAt(WHO_5, 0);
const mood = scaleAt(MOOD_ANXIETY, 0);
const anxiety = scaleAt(MOOD_ANXIETY, 1);

describe("напрямок шкали", () => {
  it("у шкалі, де більше — гірше, смуги йдуть від найкращої до найгіршої", () => {
    const snapshot = peerSnapshot(
      mood,
      tally({ phq_minimal: 2, phq_moderate: 5, phq_severe: 1 }),
      12,
    );
    expect(snapshot.bands.map((band) => band.key)).toEqual([
      "phq_minimal",
      "phq_mild",
      "phq_moderate",
      "phq_modsevere",
      "phq_severe",
    ]);
  });

  it("у шкалі благополуччя, де більше — краще, порядок зворотний", () => {
    // WHO-5: перша смуга в масиві — найгірша («Дуже низьке»), а найкраща —
    // остання («Високе»). Розподіл мусить розвернути це, інакше людина з
    // 20 барами (добре) бачить себе на дні.
    const snapshot = peerSnapshot(wellbeing, tally({ "very-low": 1, middle: 2, high: 4 }), 20);
    expect(snapshot.bands.map((band) => band.key)).toEqual(["high", "middle", "low", "very-low"]);
  });

  it("«ближчі до одужання» рахується напрямком шкали, а не порівнянням сум", () => {
    // Тривога, 12 балів: ближчі — мінімальна (2) і легка (3).
    const anxious = peerSnapshot(
      anxiety,
      tally({ gad_minimal: 2, gad_mild: 3, gad_moderate: 4 }),
      12,
    );
    expect(anxious.milderPeople).toBe(5);

    // Те саме число балів (12) у WHO-5, але там більше — краще, тому ближчі
    // до одужання — це звичайне (13–18) і високе (19–25): 2 + 4 = 6, а не 5.
    const who = peerSnapshot(wellbeing, tally({ "very-low": 1, low: 2, middle: 2, high: 4 }), 12);
    expect(who.milderPeople).toBe(6);
  });

  it("шкали одного тесту не змішуються в одну лінійку", () => {
    // Регресія: 21 бал тривоги й 21 бал настрою — різні речі, і лінійка, що
    // їх змішує, показує не «скільки людей має твій стан», а скільки людей
    // мало схоже на твоє число.
    const anxious = peerSnapshot(anxiety, tally({ gad_moderate: 3 }), 21);
    expect(anxious.total).toBe(3);
    expect(anxious.bands).toHaveLength(4);
    expect(anxious.bands.some((band) => band.key.startsWith("phq_"))).toBe(false);
  });
});

describe("місце людини в розподілі", () => {
  it("позначає смугу людини й рахує її частку", () => {
    const snapshot = peerSnapshot(
      mood,
      tally({ phq_minimal: 2, phq_mild: 2, phq_moderate: 6 }),
      12,
    );
    expect(snapshot.mine?.key).toBe("phq_moderate");
    expect(snapshot.mine?.people).toBe(6);
    expect(snapshot.mine?.percent).toBe(60);
  });

  it("не приписує твоєї смуги, якщо такого результату в шкалі немає", () => {
    // Смуги не покривають цю суму: показувати «ти тут» означало б вигадати
    // місце, якого в розподілі немає.
    const snapshot = peerSnapshot(mood, tally({ phq_minimal: 3 }), 99);
    expect(snapshot.mine).toBeNull();
    expect(snapshot.milderPeople).toBe(0);
  });

  it("порожній рахунок — це нуль людей, а не поділ на нуль", () => {
    const snapshot = peerSnapshot(mood, {}, 4);
    expect(snapshot.total).toBe(0);
    expect(snapshot.bands.every((band) => band.percent === 0)).toBe(true);
    expect(snapshot.small).toBe(true);
  });
});

describe("рахунок людей", () => {
  it("відсотки смуг дають рівно 100", () => {
    const snapshot = peerSnapshot(
      mood,
      tally({ phq_minimal: 1, phq_mild: 1, phq_moderate: 1, phq_modsevere: 1, phq_severe: 1 }),
      7,
    );
    const sum = snapshot.bands.reduce((acc, band) => acc + band.percent, 0);
    // 1 з 5 = 20% рівно, тож сума має бути 100, а не 99 чи 101 через
    // округлення кожного рядка окремо.
    expect(sum).toBe(100);
  });

  it("смуга, якої немає в шкалі, не потрапляє нікуди", () => {
    // Лічильник для невідомого ключа — це дані розбіжні з тестом. Він не
    // псує знаменник (бо в нього не входить) і не малює рядка, якого на
    // екрані немає.
    const snapshot = peerSnapshot(mood, tally({ phq_minimal: 2, phq_mild: 2, ghost_band: 50 }), 3);
    expect(snapshot.total).toBe(4);
    expect(snapshot.bands).toHaveLength(mood.bands.length);
    expect(snapshot.bands.some((band) => band.key === "ghost_band")).toBe(false);
  });

  it("рахує людей, а не рядки: п'ять проходжень однієї людини — це п'ять, а не один голос", () => {
    // Це не функція розподілу, а те, що вона має на вході: сервер віддає
    // лічильник людей. Один голос на людину перевіряється там, де рахунок
    // береться, — у `assessments-peers.service.test`.
    const snapshot = peerSnapshot(mood, tally({ phq_minimal: 1 }), 2);
    expect(snapshot.total).toBe(1);
    expect(snapshot.mine?.percent).toBe(100);
  });

  it("вибірка менша за поріг позначається як мала — дані при цьому лишаються", () => {
    const sparse = peerSnapshot(mood, tally({ phq_minimal: 2 }), 2);
    expect(sparse.total).toBe(2);
    expect(sparse.small).toBe(true);

    const enough = peerSnapshot(mood, tally({ phq_minimal: 3, phq_mild: 3 }), 2);
    expect(enough.total).toBe(PEER_SMALL_SAMPLE + 1);
    expect(enough.small).toBe(false);
  });

  it("рахує всі смуги шкали, навіть ті, у яких ще ніхто не був", () => {
    // Інакше блок показує лише «зайняті» смуги, і людина не бачить, що
    // найгірший рівень тут порожній — а це й є відповідь на її питання.
    const snapshot = peerSnapshot(mood, tally({ phq_severe: 1 }), 22);
    expect(snapshot.bands).toHaveLength(mood.bands.length);
    expect(snapshot.bands.filter((band) => band.people === 0)).toHaveLength(mood.bands.length - 1);
  });
});
