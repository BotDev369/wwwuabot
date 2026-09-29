/**
 * Блок безпеки PHQ-9 — **над усіма іншими результатами**.
 *
 * Три вимоги зі специфікації (`specs/phq9-gad7/03-safety.md` §8.2), і всі три
 * тут дотримані:
 *
 * 1. **Показується першим на екрані результату**, над балом, рівнем і
 *    порадами, і не згортається: людина, яка відповіла «майже щодня» на
 *    питання про смерть, мусить побачити це до всього іншого.
 * 2. **Тон спокійний і теплий.** Ніяких червоних спалахів, анімацій і
 *    «конфетті» — страх зупиняє людину, а не рухає до допомоги.
 * 3. **Не називає діагнозу.** Жодного «у вас суїцидальний ризик»: текст
 *    наголошує, що такі думки бувають у багатьох і що просити допомоги —
 *    нормально.
 *
 * Номери ліній допомоги — **дані** в `phq9.ts`, а не константи тут: вони
 * змінюються, і оновлення не має торкатись коду.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentSafetyBlock
 */

import { type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { AssessmentTest, SafetyLevel } from "@wwwuabot/shared/assessments";
import { BoldText } from "./BoldText";

interface AssessmentSafetyBlockProps {
  test: AssessmentTest;
  safety: SafetyLevel;
}

export function AssessmentSafetyBlock({
  test,
  safety,
}: AssessmentSafetyBlockProps): ReactElement | null {
  if (!safety.triggered || !safety.text) return null;
  const lines = test.help ?? [];
  const primary = lines.filter((line) => line.primary);
  const rest = lines.filter((line) => !line.primary);

  return (
    <section className="wb-safety" aria-live="polite">
      <p className="wb-safety-title">
        <Icon name="warning" size={18} />
        {safety.value >= 2 ? "Потрібна підтримка просто зараз" : "Дякуємо за чесність"}
      </p>
      <p className="wb-safety-text">
        <BoldText text={safety.text} />
      </p>

      <p className="wb-safety-help-title">Куди можна звернутися</p>
      <ul className="wb-safety-help">
        {primary.map((line) => (
          <li key={line.number}>
            <a href={`tel:${line.number.replace(/[^\d+]/g, "")}`}>
              <span className="wb-safety-help-name">{line.name}</span>
              <span className="wb-safety-help-number">{line.number}</span>
            </a>
            <span className="wb-safety-help-note">{line.note}</span>
          </li>
        ))}
      </ul>

      {rest.length > 0 && (
        <details className="wb-safety-more">
          <summary className="wb-safety-more-summary">
            <Icon name="info" size={16} />
            Інші лінії допомоги
            <Icon name="chevron-down" size={16} className="wb-safety-chevron" />
          </summary>
          <ul className="wb-safety-help">
            {rest.map((line) => (
              <li key={line.number}>
                <a href={`tel:${line.number.replace(/[^\d+]/g, "")}`}>
                  <span className="wb-safety-help-name">{line.name}</span>
                  <span className="wb-safety-help-number">{line.number}</span>
                </a>
                <span className="wb-safety-help-note">{line.note}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="wb-safety-foot">
        Номери актуальні станом на 2026. Перед публічним запуском перевірте їх на
        <a href="https://www.moh.gov.ua" target="_blank" rel="noreferrer">
          {" "}
          сайті МОЗ України
        </a>
        .
      </p>
    </section>
  );
}
