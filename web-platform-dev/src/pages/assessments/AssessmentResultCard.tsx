/**
 * Результат самооцінки: бал, смуга, зміна від попереднього, застереження.
 *
 * **Застереження — не дрібний шрифт, а частина виводу.** Воно стоїть у картці
 * разом із балом, а не внизу екрана: людина, що дивиться на «Добре, 82», не
 * мусить прокручувати, щоб зрозуміти, що це не діагноз. Коли бал у зоні
 * уваги, застереження стає рамкою, а під ним — порада, що робити далі.
 *
 * **Тренд поруч із балом, а не окремим екраном.** «82» не каже нічого;
 * «48 → 82» каже все. І навіть перший результат не бреше нулем: підпис каже
 * «перший замір», бо нуль на екрані читається як «не змінилось».
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentResultCard
 */

import { useMemo, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  maxRawScore,
  type AssessmentRecord,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";
import { scaleReading, trendFrom, trendLabel, type TrendDirection } from "./assessment-view";

/** Знак напряму. Для wellbeing «вгору» — це добре, тому стрілка вгору. */
const TREND_ICON: Record<TrendDirection, "arrow-up" | "arrow-down" | "minus"> = {
  up: "arrow-up",
  down: "arrow-down",
  flat: "minus",
};

interface AssessmentResultCardProps {
  test: AssessmentTest;
  record: AssessmentRecord;
  /** Уся історія — тренд рахується з двох останніх. */
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
  const band = test.bands.find((candidate) => candidate.key === record.bandKey);
  const label = trendLabel(trend);

  return (
    <div className="wb-test-card">
      <div className="wb-score">
        <span className="wb-score-value">{record.raw}</span>
        <span className="wb-score-band">з {maxRawScore(test)}</span>
      </div>

      {band && <p className="wb-score-note">{band.label}</p>}
      <p className="wb-scale-reading">{scaleReading(test, record)}</p>
      {band && <p className="wb-test-lead">{band.note}</p>}

      <div className="wb-test-meta">
        {trend.hasPrevious && label && (
          <span className={`wb-trend wb-trend--${trend.direction}`}>
            <Icon name={TREND_ICON[trend.direction]} size={14} />
            {label}
          </span>
        )}
        {record.needsAttention && <span className="wb-trend wb-trend--down">потрібна розмова</span>}
      </div>

      <p className={`wb-notice${record.needsAttention ? " wb-notice--attention" : ""}`}>
        {record.needsAttention && <Icon name="warning" size={14} />} {test.disclaimer}
      </p>

      <p className="wb-source">
        {test.source.name}. {test.source.citation} Ліцензія: {test.source.license} ·{" "}
        <a href={test.source.url} target="_blank" rel="noreferrer">
          Джерело
        </a>
      </p>
    </div>
  );
}
