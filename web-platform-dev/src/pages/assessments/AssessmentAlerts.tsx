/**
 * Персональні акценти (§6.4, §7.6, §7.7) і наслідок для життя (§7.4).
 *
 * **Це те, що відрізняє персональний результат від загального.** Людина
 * прочитала свої відповіді й вже знає їх числа; користь у тому, що їй кажуть
 * **що саме** її відповідь означає: «сон — 3 з 3» стає поясненням, що порушення
 * тривають понад 2–3 тижні й треба сказати лікареві.
 *
 * Кожне питання, відповідь на яке вище за `alertAtLeast`, показує **свій**
 * текст. Тому їх може бути кілька — і це не шум, а зміст.
 *
 * **Один блок на шкалу.** Акценти належать конкретному блоку питань, тож у
 * тесті з двома шкалами їх два, і кожен стоїть під своєю назвою.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentAlerts
 */

import { type ReactElement } from "react";
import type { ItemAlert } from "@wwwuabot/shared/assessments";
import { BoldText } from "./BoldText";

interface AssessmentAlertsProps {
  alerts: readonly ItemAlert[];
  /** Наслідок для життя — спільне питання, тому показується один раз. */
  impact: string | null;
  /** Ключові симптоми на рівні ≥ 2 — додаткове речення (§7.6). */
  coreMood: boolean;
  /** Скільки питань спрацювали — 5 і більше це вже «більшість симптомів». */
  alertCount: number;
}

/** Поріг із §7.6: п'ять і більше питань із відповіддю ≥ 2. */
const MOST_SYMPTOMS = 5;

export function AssessmentAlerts({
  alerts,
  impact,
  coreMood,
  alertCount,
}: AssessmentAlertsProps): ReactElement | null {
  if (alerts.length === 0 && !impact) return null;

  return (
    <section className="wb-alerts">
      <h3 className="wb-alerts-title">На що варто звернути увагу</h3>
      {coreMood && (
        <p className="wb-alerts-lead">
          Ключові симптоми (втрата інтересу та знижений настрій) були у вас значну частину днів. Це
          підвищує значущість результату.
        </p>
      )}
      {alertCount >= MOST_SYMPTOMS && coreMood && (
        <p className="wb-alerts-lead">
          Ви відзначили більшість симптомів на рівні «більше половини днів» або частіше. Це підстава
          для консультації фахівця.
        </p>
      )}
      <ul className="wb-alerts-list">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <span className="wb-alerts-label">{alert.label}</span>
            <p className="wb-alerts-note">
              <BoldText text={alert.note} />
            </p>
          </li>
        ))}
      </ul>
      {impact && (
        <p className="wb-alerts-impact">
          <span className="wb-alerts-label">Вплив на життя</span>
          <BoldText text={impact} />
        </p>
      )}
    </section>
  );
}
