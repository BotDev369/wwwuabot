/**
 * Спільний висновок за двома шкалами одного проходження (§7.5).
 *
 * **Живе на картці результату, а не на сторінці «Розвиток».** Власник
 * 29.09.2026 сказав прямо: у списку мають бути тільки картки-прев'ю тестів, а
 * все, що стосується деталей тесту, — усередині тесту. Цей блок і є деталлю
 * тесту, тож він стоїть після обох шкал, де видно й самі числа.
 *
 * **Показується лише коли шкал дві.** Тест з однією шкалою (WHO-5) не має
 * чого порівнювати, тож блок мовчить, а не малює половину висновку.
 *
 * **Числа зі знаменниками.** «Настрій: 10 · Тривога: 0» — це два голі числа, з
 * яких важче дістати висновок, ніж не отримати жодного: не видно ні звідки 10,
 * ні того, що нуль тривоги це відносно 21. Знаменник береться з шкали тесту, а
 * не пишеться в текст, тож зміна шкали не залишить тут брехні.
 *
 * **Блок мусить пояснювати себе першим рядком.** Людина читає його після двох
 * блоків із балами, тож перший рядок каже прямо, що це висновок із двох шкал,
 * а далі йдуть числа зі знаменниками.
 *
 * @module web-platform-dev/src/pages/assessments/CombinedConclusion
 */

import { type ReactElement } from "react";
import {
  combinedKeyOf,
  maxRawScore,
  safetyOf,
  type AssessmentRecord,
  type AssessmentScale,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";
import { COMBINED_HEADLINE, COMBINED_TEXTS, SAFETY_POINTER } from "./combined";
import { BoldText } from "./BoldText";

interface CombinedConclusionProps {
  test: AssessmentTest;
  /** Результати обох шкал, у порядку шкал тесту. */
  records: readonly AssessmentRecord[];
}

export function CombinedConclusion({
  test,
  records,
}: CombinedConclusionProps): ReactElement | null {
  // Без обох замірів висновку нема: рахувати «10 з» без знаменника означає
  // показати число, якого не можна прочитати.
  if (test.scales.length < 2 || records.length < 2) return null;
  const [first, second] = records;
  const [firstScale, secondScale] = test.scales;
  if (!first || !second || !firstScale || !secondScale) return null;

  const text = COMBINED_TEXTS[combinedKeyOf(first.raw, second.raw)];
  // Блок безпеки вже показаний на картці результату вище. Повторювати його тут
  // не треба: два однакові застереження поспіль знецінюють обидва.
  const safety = safetyOf(test, first.answers);

  return (
    <section className="wb-combined">
      <p className="wb-combined-overline">{COMBINED_HEADLINE}</p>
      <h2 className="wb-combined-title">{text.title}</h2>
      <p className="wb-combined-scores">
        {scaleLine(firstScale, first, test)} · {scaleLine(secondScale, second, test)}
      </p>
      <p className="wb-combined-body">
        <BoldText text={text.body} />
      </p>
      {safety.triggered && <p className="wb-combined-note">{SAFETY_POINTER}</p>}
    </section>
  );
}

/** «Настрій: 10 із 27» — з назвою шкали, знаменником і голосом. */
function scaleLine(scale: AssessmentScale, record: AssessmentRecord, test: AssessmentTest): string {
  return `${scale.title}: ${record.raw} із ${maxRawScore(test, scale)}`;
}
