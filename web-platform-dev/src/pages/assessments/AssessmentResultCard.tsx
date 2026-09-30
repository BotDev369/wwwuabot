/**
 * Картка результату проходження: **спочатку про людину, потім усе інше.**
 *
 * **Складається з блоків по шкалу.** «Тревожність і депресія» має дві шкали, тож
 * картка має два результати, спільний висновок за ними й спільну довідку про
 * інструмент. Один бал на тест тут неможливий — і не тому, що «не вміщується»,
 * а тому що 12 балів настрою і 12 балів тривоги — це різні речі.
 *
 * **Довідка — в акордеоні, закритому за замовчуванням.** Атрибуція, ліцензії,
 * застереження «це не діагноз» і арифметика шкал потрібні за кожним пунктом
 * ліцензії, але **не перед першим поглядом**: коли вони займали більше
 * половини екрана, результат просто не вміщувався, а людина не дочитувала
 * його до кінця. Вони лишаються в один дотик, а не зникають.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentResultCard
 */

import { useMemo, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  safetyOf,
  type AssessmentRecord,
  type AssessmentTest,
  type PeerTallies,
} from "@wwwuabot/shared/assessments";
import { impactReading, trendFrom, trendLabel } from "./assessment-view";
import { AssessmentSafetyBlock } from "./AssessmentSafetyBlock";
import { AssessmentScaleResult } from "./AssessmentScaleResult";
import { CombinedConclusion } from "./CombinedConclusion";

interface AssessmentResultCardProps {
  test: AssessmentTest;
  /** Рядки цього проходження — по одному на шкалу, у порядку шкал тесту. */
  records: readonly AssessmentRecord[];
  /** Вся історія — тренд рахується з двох останніх. */
  history: readonly AssessmentRecord[];
  /** Розподіл по смугах кожної шкали. */
  peers: PeerTallies;
}

export function AssessmentResultCard({
  test,
  records,
  history,
  peers,
}: AssessmentResultCardProps): ReactElement {
  // Рядки цього проходження ставиться перед історією: тренд має рахуватися
  // від щойно показаного результату, а не від наступного за порядком.
  const ordered = useMemo(() => {
    const seen = new Set(records.map((one) => one.id));
    return [...records, ...history.filter((one) => !seen.has(one.id))];
  }, [records, history]);

  const safety = safetyOf(test, records[0]?.answers ?? []);
  const impact = records[0] ? impactReading(test, records[0]) : null;
  const trends = test.scales.map((scale) => trendFrom(ordered, test, scale));

  return (
    <div className="wb-test-card">
      <AssessmentSafetyBlock test={test} safety={safety} />

      {test.scales.map((scale, index) => {
        const record = records.find((one) => one.scaleKey === scale.key);
        if (!record) return null;
        const trend = trends[index];
        const label = trendLabel(trend);
        return (
          <div key={scale.key}>
            <AssessmentScaleResult
              test={test}
              scale={scale}
              record={record}
              tally={peers[scale.key] ?? {}}
              // Питання про вплив одне на все проходження, тож і текст про
              // нього показується один раз — під першою шкалою.
              impact={index === 0 ? impact : null}
            />
            {trend.hasPrevious && label && (
              <div className="wb-test-meta">
                <span className={`wb-trend wb-trend--${trend.direction}`}>
                  <Icon
                    name={
                      trend.direction === "up"
                        ? "arrow-up"
                        : trend.direction === "down"
                          ? "arrow-down"
                          : "minus"
                    }
                    size={14}
                  />
                  {label}
                </span>
              </div>
            )}
          </div>
        );
      })}

      <CombinedConclusion test={test} records={records} />

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
            <p
              className={`wb-notice${records.some((one) => one.needsAttention) ? " wb-notice--attention" : ""}`}
            >
              <Icon name="warning" size={14} /> {test.disclaimer}
            </p>
          )}
          {/* Джерело на кожен інструмент: у цього тесту їх два, і кожен має
              свою публікацію та ліцензію. Одне на двох не згодилося б з
              вимогою атрибуції. */}
          {test.sources.map((source) => (
            <p key={source.name} className="wb-source">
              {/* Крапка ставиться лише коли ім'я не закінчується нею самою:
                  «Pfizer Inc.» + «.» читалося як «Inc..» — дві крапки в
                  атрибуції виглядають як помилка друку. */}
              {source.name}
              {source.name.endsWith(".") ? " " : ". "}
              {source.citation} Ліцензія: {source.license} ·{" "}
              <a href={source.url} target="_blank" rel="noreferrer">
                Джерело
              </a>
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}
