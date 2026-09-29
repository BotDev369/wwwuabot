/**
 * Спільний висновок за PHQ-9 і GAD-7 (§7.5).
 *
 * **Показується лише коли є обидва результати** — інакше це судження про людину
 * на основі половини даних. Специфікація (§7.5) вимагає показати блок за
 * комбінацією, тож бракує одного заміру не «показуємо порожнє», а не
 * показуємо взагалі.
 *
 * **Свідомо не на екрані одного результату.** На картці PHQ-9 людина про себе,
 * і додати туди чужі дані означало б змішати два розмови в одну.
 *
 * **Числа зі знаменниками.** «Настрій і депресія: 10 · Тривога: 0» — це два
 * голі числа, з яких важче дістати висновок, ніж не отримати жодного: не видно
 * ні звідки 10, ні того, що нуль тривоги це відносно 21. Знаменник береться з
 * шкали тесту, а не пишется в текст, тож зміна шкали не залишить тут брехні.
 *
 * @module web-platform-dev/src/pages/assessments/CombinedConclusion
 */

import { type ReactElement } from "react";
import {
  combinedKeyOf,
  maxRawScore,
  safetyOf,
  type AssessmentRecord,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";
import { COMBINED_HEADLINE, COMBINED_TEXTS, SAFETY_POINTER } from "./combined";
import { BoldText } from "./BoldText";

interface CombinedConclusionProps {
  tests: readonly AssessmentTest[];
  results: readonly AssessmentRecord[];
}

export function CombinedConclusion({
  tests,
  results,
}: CombinedConclusionProps): ReactElement | null {
  const phq9 = results.find((record) => record.testKey === "phq9");
  const gad7 = results.find((record) => record.testKey === "gad7");
  const phqTest = tests.find((test) => test.key === "phq9");
  const gadTest = tests.find((test) => test.key === "gad7");
  // Без обох замірів і обох шкал висновку нема: рахувати «10 з» без знаменника
  // означає показати число, якого не можна прочитати.
  if (!phq9 || !gad7 || !phqTest || !gadTest) return null;

  const text = COMBINED_TEXTS[combinedKeyOf(phq9.raw, gad7.raw)];
  // Блок безпеки вже показаний на картці PHQ-9. Повторювати його тут, у
  // списку, не треба: два однакові застереження поспіль знецінюють обидва.
  const safety = safetyOf(phqTest, phq9.answers);

  return (
    <section className="wb-combined">
      <p className="wb-combined-overline">{COMBINED_HEADLINE}</p>
      <h2 className="wb-combined-title">{text.title}</h2>
      <p className="wb-combined-scores">
        Настрій: {phq9.raw} із {maxRawScore(phqTest)} · Тривога: {gad7.raw} із{" "}
        {maxRawScore(gadTest)}
      </p>
      <p className="wb-combined-body">
        <BoldText text={text.body} />
      </p>
      {safety?.triggered && <p className="wb-combined-note">{SAFETY_POINTER}</p>}
    </section>
  );
}
