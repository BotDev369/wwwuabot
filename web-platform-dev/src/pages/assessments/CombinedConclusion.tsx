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
 * @module web-platform-dev/src/pages/assessments/CombinedConclusion
 */

import { type ReactElement } from "react";
import {
  combinedKeyOf,
  safetyOf,
  type AssessmentRecord,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";
import { COMBINED_TEXTS } from "./combined";
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
  if (!phq9 || !gad7) return null;

  const phqTest = tests.find((test) => test.key === "phq9");
  const gadTest = tests.find((test) => test.key === "gad7");
  const text = COMBINED_TEXTS[combinedKeyOf(phq9.raw, gad7.raw)];
  // Блок безпеки вже показаний на картці PHQ-9. Повторювати його тут, у
  // списку, не треба: два однакові застереження поспіль знецінюють обидва.
  const safety = phqTest ? safetyOf(phqTest, phq9.answers) : null;

  return (
    <section className="wb-combined">
      <p className="wb-combined-overline">Разом за двома шкалами</p>
      <h2 className="wb-combined-title">{text.title}</h2>
      <p className="wb-combined-scores">
        Настрій і депресія: {phq9.raw} · Тривога: {gad7.raw}
      </p>
      <p className="wb-combined-body">
        <BoldText text={text.body} />
      </p>
      {gadTest && safety?.triggered && (
        <p className="wb-combined-note">
          Про відповідь на питання безпеки — на картці «Настрій і депресія».
        </p>
      )}
    </section>
  );
}
