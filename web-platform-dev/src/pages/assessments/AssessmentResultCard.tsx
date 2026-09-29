/**
 * Результат самооцінки: **спочатку про людину, потім усе інше.**
 *
 * **Порядок блоків — це і є трактування.** На картці спершу стоїть не бал, а
 * розкид по сферах («відпочинок — 2 з 5»), бо саме він відповідає на питання
 * «що зі мною», з яким людина прийшла. Бал без нього — це про інструмент,
 * а не про людину.
 *
 * **Довідка — в акордеоні, закритому за замовчуванням.** Атрибуція, ліцензія,
 * застереження «це не діагноз» і арифметика шкали потрібні за кожним пунктом
 * ліцензії, але **не перед першим поглядом**: коли вони займали більше
 * половини екрана, результат просто не вміщувався, а людина не дочитувала
 * його до кінця. Вони лишаються в один дотик, а не зникають.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentResultCard
 */

import { useMemo, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  alertCount as countAlerts,
  impactText as impactTextOf,
  impactValue,
  isCoreMoodAlarmed,
  itemAlerts,
  maxRawScore,
  safetyOf,
  type AssessmentRecord,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";
import {
  profileReading,
  thresholdLine,
  trendFrom,
  trendLabel,
  type TrendDirection,
} from "./assessment-view";
import { AssessmentAlerts } from "./AssessmentAlerts";
import { AssessmentSafetyBlock } from "./AssessmentSafetyBlock";
import { BoldText } from "./BoldText";

/** Знак напряму. Для wellbeing «вгору» — це добре, тому стрілка вгору. */
const TREND_ICON: Record<TrendDirection, "arrow-up" | "arrow-down" | "minus"> = {
  up: "arrow-up",
  down: "arrow-down",
  flat: "minus",
};

interface AssessmentResultCardProps {
  test: AssessmentTest;
  record: AssessmentRecord;
  /** Вся історія — тренд рахується з двох останніх. */
  history: readonly AssessmentRecord[];
}

export function AssessmentResultCard({
  test,
  record,
  history,
}: AssessmentResultCardProps): ReactElement {
  // `latest` — той самий рядок, що показали; тренд рахуємо по ньому, щоб
  // лічильник «від попереднього» не рахувався від наступного за порядком.
  const latest = useMemo(
    () => [record, ...history.filter((item) => item.id !== record.id)],
    [record, history],
  );
  const trend = useMemo(() => trendFrom(latest, test), [latest, test]);
  const profile = useMemo(() => profileReading(test, record), [test, record]);
  const band = test.bands.find((candidate) => candidate.key === record.bandKey);
  const label = trendLabel(trend);
  // Прапорці рахуються з тих самих відповідей, що лежать у рядку: вони не
  // зберігаються окремо, тож старий результат отримує ту саму поведінку.
  const safety = safetyOf(test, record.answers);
  const alerts = itemAlerts(test, record.answers);
  const impact = impactTextOf(test.impact, impactValue(test, record.answers));

  return (
    <div className="wb-test-card">
      <AssessmentSafetyBlock test={test} safety={safety} />

      <div className="wb-score">
        <span className="wb-score-value">{record.raw}</span>
        <span className="wb-score-band">з {maxRawScore(test)}</span>
      </div>

      {band && <p className="wb-score-note">{band.label}</p>}

      <div className="wb-profile">
        <p className="wb-profile-line">{profile.strongest}</p>
        <p className="wb-profile-line wb-profile-line--weak">{profile.weakest}</p>
        {profile.question && <p className="wb-profile-question">{profile.question}</p>}
        <p className="wb-scale-reading">{thresholdLine(test, record)}</p>
      </div>

      {band && (
        <p className="wb-test-lead">
          <BoldText text={band.note} />
        </p>
      )}

      <AssessmentAlerts
        test={test}
        alerts={alerts}
        impact={impact}
        coreMood={isCoreMoodAlarmed(test, record.answers)}
        alertCount={countAlerts(test, record.answers)}
      />

      <div className="wb-test-meta">
        {trend.hasPrevious && label && (
          <span className={`wb-trend wb-trend--${trend.direction}`}>
            <Icon name={TREND_ICON[trend.direction]} size={14} />
            {label}
          </span>
        )}
        {record.needsAttention && <span className="wb-trend wb-trend--down">потрібна розмова</span>}
      </div>

      {test.disclaimerInline && (
        <p className="wb-notice wb-notice--required">
          <Icon name="info" size={14} /> {test.disclaimer}
        </p>
      )}

      <details className="wb-about">
        <summary className="wb-about-summary">
          <Icon name="info" size={16} />
          Про цей тест
          <Icon name="chevron-down" size={16} className="wb-about-chevron" />
        </summary>
        <div className="wb-about-body">
          <p>{test.about}</p>
          {test.disclaimerInline ? null : (
            <p className={`wb-notice${record.needsAttention ? " wb-notice--attention" : ""}`}>
              {record.needsAttention && <Icon name="warning" size={14} />} {test.disclaimer}
            </p>
          )}
          <p className="wb-source">
            {test.source.name}. {test.source.citation} Ліцензія: {test.source.license} ·{" "}
            <a href={test.source.url} target="_blank" rel="noreferrer">
              Джерело
            </a>
          </p>
        </div>
      </details>
    </div>
  );
}
