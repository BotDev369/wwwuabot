/**
 * Каталог тестів усередині фічі: назва, час і скільки якостей додає. Тест —
 * другий вектор того самого ядра, тому живé під «Аналізом».
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisTestsPage
 */

import { type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { plural, type PluralForms } from "@wwwuabot/shared/utils/plural";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { useAssessments } from "@/pages/assessments/useAssessments";
import { ANALYSIS_PATH, analysisTestPath } from "@/app/routes";

const QUESTIONS: PluralForms = ["питання", "питання", "питань"];
const MINUTES: PluralForms = ["хвилина", "хвилини", "хвилин"];
const QUALITIES: PluralForms = ["якість", "якості", "якостей"];

/** Скільки якостей ядра пише тест: відповіді → фактори → якості. */
const QUALITY_COUNTS: Readonly<Record<string, number>> = { bigfive: 16 };

/** Оцінка часу: одне питання — близько двадцяти секунд. */
function minutesOf(items: number): number {
  return Math.max(1, Math.round((items * 20) / 60));
}

export function AnalysisTestsPage(): ReactElement {
  useScreenChrome({ title: "Пройти тестування" });
  const navigate = useNavigate();
  const { tests, loading } = useAssessments();

  return (
    <div className="wb-page wb-page-scroll">
      <div className="an-hub">
        <a className="an-back" href={ANALYSIS_PATH}>
          <Icon name="arrow-left" size={16} />
          До розділів
        </a>

        <header className="an-hero an-hero--slim">
          <h1 className="an-hero__title">Пройти тестування</h1>
          <p className="an-hero__lead">
            Ваші відповіді додають до профілю виміряні якості — окремо від дати.
          </p>
        </header>

        {loading && <p className="an-empty">Завантажуємо тести…</p>}

        <div className="an-test-list">
          {tests.map((test) => {
            const questions = test.items.length;
            const minutes = minutesOf(questions);
            const qualities = QUALITY_COUNTS[test.key] ?? 0;
            return (
              <button
                key={test.key}
                type="button"
                className="an-test-card"
                onClick={() => navigate(analysisTestPath(test.key))}
              >
                <span className="an-test-card__icon" aria-hidden="true">
                  <Icon name={test.icon} size={20} />
                </span>
                <span className="an-test-card__body">
                  <span className="an-test-card__title">{test.title}</span>
                  <span className="an-test-card__lead">{test.lead}</span>
                  <span className="an-test-card__meta">
                    {questions} {plural(questions, QUESTIONS)} · {minutes}{" "}
                    {plural(minutes, MINUTES)}
                    {qualities > 0 && ` · додає ${qualities} ${plural(qualities, QUALITIES)}`}
                  </span>
                </span>
                <Icon name="chevron-right" size={18} />
              </button>
            );
          })}
        </div>

        <p className="an-foot">
          Результат зберігається у вашому профілі.{" "}
          <Link to={ANALYSIS_PATH}>Повернутись до розділів</Link>.
        </p>
      </div>
    </div>
  );
}
