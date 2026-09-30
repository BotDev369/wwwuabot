/**
 * Тексти блоку «Ти не один»: **що саме людина прочитає про себе.**
 *
 * Найважливіше тут — не граматика, а чесність. Блок каже речі на кшталт
 * «34 людини пройшли цей тест» і «стан, ближчий до одужання, у 9 людей»,
 * тому кожен рядок перевіряється на випадки, де така фраза **бреше**:
 *
 *  - вибірка з однієї людини («ти тут один», а не «більшість»);
 *  - вибірка з трьох (дані є, але сказано, що їх мало);
 *  - напрямок шкали (у WHO-5 більше бала — краще, тому «ближчі до одужання»
 *    рахує з того боку, а не з того самого, що в шкалі симптомів);
 *  - заборонені слова (блок не має називати людей кращими чи гіршими).
 *
 * @module web-platform-dev/src/pages/assessments/peer-view.test
 */

import { describe, expect, it } from "vitest";
import { MOOD_ANXIETY, peerSnapshot } from "@wwwuabot/shared/assessments";
import { peerAlongside, peerHeadline, peerPlace, peerReading, peerSmallNote } from "./peer-view";

/** Шкала настрою: 12 балів — помірні симптоми. */
const MOOD = MOOD_ANXIETY.scales[0];
const phq = (people: Record<string, number>, raw = 12) => peerSnapshot(MOOD, people, raw);

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
    expect(peerHeadline(peerSnapshot(MOOD, {}, 5))).toContain("немає чужих результатів");
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

/**
 * Регресія: **блок не має вишиковувати людей один над одним.**
 *
 * Раніше тут стояло «Кращих за тебе — 12 людей», і власник спитав, чи я
 * здурів. По-перше, це називало людей кращими, тобто робило з розподілу
 * оцінку, від якої весь блок відсторонюється. По-друге, порівнювати треба не
 * людей, а рівні стану. Нижче два тести: перший — напрямок рахунку, другий —
 * слова, які в блоці заборонені.
 */
describe("стан поруч", () => {
  it("рахує тих, хто ближче до одужання, і закінчується тим, що з цим можна зробити", () => {
    // 24 людини: 8 мінімальних, 12 легких, 4 помірних. Ти — у помірній, тож
    // ближчих до одужання 8 + 12 = 20, а це 83% від усіх.
    const snapshot = phq({ phq_minimal: 8, phq_mild: 12, phq_moderate: 4 });
    const text = peerAlongside(snapshot);
    expect(text).toContain("20 людей");
    expect(text).toContain("83%");
    expect(text).toContain("повтори тест");
  });

  it("немає ближчих до одужання — це сказано прямо, а не порожнім рядком", () => {
    // `raw = 2` — щоб ти був у найкращій смузі, де ніхто не має кращого стану.
    expect(peerAlongside(phq({ phq_minimal: 30 }, 2))).toContain("ні в кого немає");
  });

  it("друга шкала того самого тесту рахує той самий бік", () => {
    // 12 балів тривоги = помірна тривога; ближчих до одужання — мінімальна й легка.
    const text = peerAlongside(
      peerSnapshot(MOOD_ANXIETY.scales[1], { gad_minimal: 5, gad_mild: 5 }, 12),
    );
    expect(text).toContain("10 людей");
  });

  it("у блоці немає слів, що роблять людей ієрархією", () => {
    // Кожне з цих слів ставить когось над кимось або називає людину станом.
    // Розподіл має показувати рівні, а не вишиковувати людей один над одним.
    const banned = [/кращ\w* за тебе/i, /гірш\w* за тебе/i, /кращих людей/i, /гірших людей/i];
    const reading = peerReading(phq({ phq_minimal: 8, phq_mild: 12, phq_moderate: 4 }));
    const said = [reading.headline, reading.place, reading.alongside, reading.smallNote].join(" ");
    for (const pattern of banned) {
      expect(said, pattern.toString()).not.toMatch(pattern);
    }
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
    expect(reading.alongside).toContain("7 людей");
    expect(reading.smallNote).toBe("");
  });
});
