/**
 * Тексти блоку «Ти не один»: **що саме людина прочитає про себе.**
 *
 * Найважливіше тут — не граматика, а чесність. Блок каже речі на кшталт
 * «34 людини пройшли цей тест» і «кращих за тебе — 9», тому кожен рядок
 * перевіряється на випадки, де така фраза **бreше**:
 *
 *  - вибірка з однієї людини («ти тут один», а не «більшість»);
 *  - вибірка з трьох (дані є, але сказано, що їх мало);
 *  - напрямок шкали (в WHO-5 більше бала — краще, тому «кращих за тебе» рахує
 *    тий бік, а не той самий, що в PHQ-9).
 *
 * @module web-platform-dev/src/pages/assessments/peer-view.test
 */

import { describe, expect, it } from "vitest";
import { GAD_7, PHQ_9, peerSnapshot } from "@wwwuabot/shared/assessments";
import { peerBetter, peerHeadline, peerPlace, peerReading, peerSmallNote } from "./peer-view";

/** PHQ-9: 12 балів — помірні симптоми. */
const phq = (people: Record<string, number>, raw = 12) => peerSnapshot(PHQ_9, people, raw);

describe("головний рядок", () => {
  it("називає число людей, а не «багато хтось»", () => {
    const text = peerHeadline(phq({ phq_minimal: 10, phq_mild: 20, phq_moderate: 4 }));
    expect(text).toContain("34");
    expect(text).toContain("пройшли");
  });

  it("одна людина — це прямо сказано, а не сховано за відсотком", () => {
    // «100% людей мають такий самий результат» звучало б як твердження про
    // тисячі, а насправді це сам автор тесту.
    expect(peerHeadline(phq({ phq_moderate: 1 }))).toBe(
      "Це поки що єдиний результат у базі — ти перший.",
    );
  });

  it("порожня база — теж відповідь, а не порожній рядок", () => {
    expect(peerHeadline(peerSnapshot(PHQ_9, {}, 5))).toContain("немає чужих результатів");
  });
});

describe("твоє місце", () => {
  it("рахує інших, а не себе", () => {
    // У смузі 6 людей, один з них — ти: «у 5 людей, крім тебе».
    const text = peerPlace(phq({ phq_minimal: 2, phq_mild: 2, phq_moderate: 6 }));
    expect(text).toContain("5 людей");
    expect(text).toContain("крім тебе");
    expect(text).toContain("60%");
  });

  it("єдиний у своїй смузі — так і сказано", () => {
    expect(peerPlace(phq({ phq_moderate: 1 }))).toContain("один");
  });

  it("без своєї смуги рядок порожній, а не вигаданий", () => {
    expect(peerPlace(phq({ phq_minimal: 3 }, 99))).toBe("");
  });
});

describe("кращі за тебе", () => {
  it("закінчується не оцінкою, а тим, що з цим можна зробити", () => {
    const text = peerBetter(phq({ phq_minimal: 8, phq_mild: 12, phq_moderate: 4 }));
    expect(text).toContain("20 людей");
    expect(text).toContain("повтори тест");
  });

  it("нуль кращих — це найкраща група, а не порожне місце", () => {
    // `raw = 2` — щоб людина була в найкращій смузі, а не в помірній.
    expect(peerBetter(phq({ phq_minimal: 30 }, 2))).toContain("найкращій");
  });

  it("у GAD-7 рахує тий самий бік, що й у PHQ-9", () => {
    // 12 балів GAD-7 = помірна тривога; кращі — мінімальна й легка.
    const text = peerBetter(peerSnapshot(GAD_7, { gad_minimal: 5, gad_mild: 5 }, 12));
    expect(text).toContain("10 людей");
  });
});

describe("мала вибірка", () => {
  it("дані лишаються, але сказано, що їх мало", () => {
    const snapshot = phq({ phq_minimal: 1, phq_moderate: 2 });
    expect(snapshot.total).toBe(3);
    expect(peerSmallNote(snapshot)).toContain("мало");
    // Головний рядок при цьому не зникає: чесність — не привід нічого ховати.
    expect(peerHeadline(snapshot)).toContain("3");
  });

  it("при достатній вибірці примітки немає", () => {
    const snapshot = phq({ phq_minimal: 4, phq_mild: 4 });
    expect(peerSmallNote(snapshot)).toBe("");
  });
});

describe("peerReading", () => {
  it("збирає все, що блок говорить, в одному місці", () => {
    const reading = peerReading(phq({ phq_minimal: 3, phq_mild: 4, phq_moderate: 5 }));
    expect(reading.headline).toContain("12");
    expect(reading.place).toContain("крім тебе");
    expect(reading.better).toContain("7 людей");
    expect(reading.smallNote).toBe("");
  });
});
