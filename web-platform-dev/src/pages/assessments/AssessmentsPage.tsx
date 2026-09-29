/**
 * «Розвиток» — список тестів самооцінки з останнім результатом.
 *
 * **Екран про себе, а не каталог.** Картка тесту показує не «ваш тест», а
 * **останній бал і зміну від попереднього** — саме це й змушує повертатись.
 * Тест без жодного заміру каже «ще не проходили» і чекає на кнопку, а не
 * виглядає порожнім рядком.
 *
 * **Пройдений тест лишається в списку** з датою: історія поруч дорівнює
 * проторі над самим числом.
 *
 * Шлях власний (`/assessments`), а не `slug` рядка `scenarios`: список
 * складається з даних людини (таблиця `assessment_results`), а не з
 * `page_data` (AGENTS.md §7).
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentsPage
 */

import { useMemo, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  maxRawScore,
  type AssessmentRecord,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";
import { formatDay } from "@wwwuabot/shared/utils/datetime";
import { latestByTest, trendFrom, trendLabel } from "./assessment-view";
import { CombinedConclusion } from "./CombinedConclusion";
import { ASSESSMENTS_ROUTE } from "@/app/routes";

interface AssessmentsPageProps {
  tests: readonly AssessmentTest[];
  results: readonly AssessmentRecord[];
  loading: boolean;
  onOpen: (testKey: string) => void;
}

export function AssessmentsPage({
  tests,
  results,
  loading,
  onOpen,
}: AssessmentsPageProps): ReactElement {
  const latest = useMemo(() => latestByTest(results), [results]);

  return (
    <div className="wb-page wb-page-scroll">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Розвиток</h1>
      </div>

      <CombinedConclusion tests={tests} results={results} />

      <div className="wb-test-list">
        {loading && <p className="wb-test-lead">Завантаження…</p>}

        {!loading && tests.length === 0 && (
          <div className="wb-empty">
            <Icon name="progress" size={24} />
            <p className="wb-empty-text">Тут поки немає жодного тесту.</p>
          </div>
        )}

        {tests.map((test) => {
          const record = latest.get(test.key);
          const trend = trendFrom(results, test);
          const label = trendLabel(trend);
          const band = record ? test.bands.find((one) => one.key === record.bandKey) : undefined;

          return (
            <div key={test.key} className="wb-test-card">
              <div className="wb-test-head">
                <h2 className="wb-test-title">{test.title}</h2>
                {/* **Бал у балах, а не у відсотках.** «0» без нічого поруч
                    не читається: невідомо, чи це нуль, чи відсоток від
                    сотні. «0 з 21» — це те саме число, що й на картці
                    результату, тож список і результат кажуть одне. */}
                {record && (
                  <span className="wb-score-value">
                    {record.raw}
                    <span className="wb-score-band"> з {maxRawScore(test)}</span>
                  </span>
                )}
              </div>

              <p className="wb-test-lead">{test.lead}</p>

              <div className="wb-test-meta">
                {record ? (
                  <>
                    {/* Дата з колонки — у вигляді людини: «29.09.2026», а не
                        сирий `2026-09-29`, який був у списку. */}
                    <span>{formatDay(record.createdAt)}</span>
                    {band && <span>{band.label}</span>}
                    {label && (
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
                    )}
                  </>
                ) : (
                  <span>ще не проходили</span>
                )}
              </div>

              <button
                type="button"
                className="wb-btn wb-btn-primary"
                onClick={() => onOpen(test.key)}
              >
                {record ? "Пройти знову" : "Пройти"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="wb-source">
        Результати приватні: їх не видно у публічному профілі й ніде, крім «Розвитку». Адреса
        розділу — {ASSESSMENTS_ROUTE}.
      </p>
    </div>
  );
}
