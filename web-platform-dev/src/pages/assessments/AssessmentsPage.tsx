/**
 * «Розвиток» — список тестів самооцінки з останнім результатом.
 *
 * **Тільки картки, нічого іншого.** Власник 29.09.2026 сказав прямо: на
 * сторінці мають бути картки-прев'ю тестів, а все, що стосується деталей
 * тесту, — усередині самого тесту. Тому тут немає ані спільного висновку за
 * шкалами, ані розподілу, ані пояснень: список відповідає на одне питання —
 * «що я вже проходив і як змінилося».
 *
 * **Картка — це прев'ю, а не результат.** Вона показує останній бал і зміну
 * від попереднього, бо саме це й змушує повертатись; усе інше (розкид по
 * сферах, «що це означає», «Ти не один») лишається на картці результату.
 *
 * **Шкали видно окремо.** У теста з двома шкалами одна цифра в шапці нічого не
 * каже: «10» — це настрій чи тривога? Тому в списку рядок на кожну шкалу з
 * назвою блока, а велика цифра в шапці — найвища з них.
 *
 * **Пройдений тест лишається в списку** з датою: історія поруч дорівнює
 * просторі над самим числом.
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
import { latestByScale, trendFrom, trendLabel } from "./assessment-view";
import { ASSESSMENTS_ROUTE } from "@/app/routes";

interface AssessmentsPageProps {
  tests: readonly AssessmentTest[];
  results: readonly AssessmentRecord[];
  loading: boolean;
  onOpen: (testKey: string) => void;
}

/**
 * Бал, який стоїть у шапці картки: **найвищий відсоток серед шкал**.
 *
 * Більший відсоток — це не «страшніше» ( напрямок шкали різний), а те, що
 * потрібніше уваги: у тесті з двома шкалами одна цифра має означати щось, і
 * найбільший відсоток — єдина чесна відповідь на «що там».
 */
function headlinePercent(records: readonly AssessmentRecord[]): number {
  return records.reduce((max, record) => Math.max(max, record.percent), -1);
}

export function AssessmentsPage({
  tests,
  results,
  loading,
  onOpen,
}: AssessmentsPageProps): ReactElement {
  const latest = useMemo(() => latestByScale(results), [results]);

  return (
    <div className="wb-page wb-page-scroll">
      <div className="wb-test-list">
        {loading && <p className="wb-test-lead">Завантаження…</p>}

        {!loading && tests.length === 0 && (
          <div className="wb-empty">
            <Icon name="progress" size={24} />
            <p className="wb-empty-text">Тут поки немає жодного тесту.</p>
          </div>
        )}

        {tests.map((test) => {
          // Рядок на кожну шкалу: у тесті їх може бути одна або дві, і список
          // має назвати кожну — інакше «10» у шапці не про що.
          const perScale = test.scales.map((scale) => {
            const record = latest.get(`${test.key}:${scale.key}`);
            return {
              scale,
              record,
              trend: trendFrom(results, test, scale),
              band: record ? scale.bands.find((one) => one.key === record.bandKey) : undefined,
            };
          });
          const withResult = perScale.filter((one) => one.record !== undefined);
          const percent = headlinePercent(withResult.map((one) => one.record as AssessmentRecord));

          return (
            <div key={test.key} className="wb-test-card">
              <div className="wb-test-head">
                <h2 className="wb-test-title">{test.title}</h2>
                {/* **Бал у балах, а не у відсотках.** «0» без нічого поруч
                    не читається: невідомо, чи це нуль, чи відсоток від
                    сотні. Рядки нижче називають шкалу й знаменник, тож
                    список і результат кажуть одне. */}
                {percent >= 0 ? (
                  <span className="wb-test-score">{percent}%</span>
                ) : (
                  /* **Прокинутий бал на місці результату.** Місця тепер
                     займає стільки ж, тож рядок читається як «поки що
                     немає», а не «зламано». */
                  <span className="wb-test-score wb-test-score--none">—</span>
                )}
              </div>

              <p className="wb-test-lead">{test.lead}</p>

              <div className="wb-test-meta">
                {withResult.length === 0 && <span>ще не проходили</span>}
                {withResult.map(({ scale, record, band, trend }) => {
                  const label = trendLabel(trend);
                  return (
                    <span key={scale.key} className="wb-test-scale-row">
                      <span className="wb-test-scale-name">{scale.title}</span>
                      <span className="wb-test-scale-score">
                        {record?.raw} з {maxRawScore(test, scale)}
                      </span>
                      {/* Дата з колонки — у вигляді людини: «29.09.2026», а не
                          сирий `2026-09-29`, який був у списку. */}
                      {record && <span>{formatDay(record.createdAt)}</span>}
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
                    </span>
                  );
                })}
              </div>

              <button
                type="button"
                className="wb-btn wb-btn-primary"
                onClick={() => onOpen(test.key)}
              >
                {withResult.length > 0 ? "Пройти знову" : "Пройти"}
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
