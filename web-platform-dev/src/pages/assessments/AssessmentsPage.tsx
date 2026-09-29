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
import type { AssessmentRecord, AssessmentTest } from "@wwwuabot/shared/assessments";
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

          return (
            <div key={test.key} className="wb-test-card">
              <div className="wb-test-head">
                <h2 className="wb-test-title">{test.title}</h2>
                {record && <span className="wb-score-value">{record.percent}</span>}
              </div>

              <p className="wb-test-lead">{test.lead}</p>

              <div className="wb-test-meta">
                {record ? (
                  <>
                    <span>{record.createdAt.slice(0, 10)}</span>
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
