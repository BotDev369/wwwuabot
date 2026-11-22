/**
 * Проходження тесту: після відповідей сервер уже записав свідчення в ядро, тож
 * екран веде в профіль, де видно, що додали відповіді.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisTestScreen
 */

import { useEffect, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { LENSES } from "@wwwuabot/shared/qualities";
import { fetchMyDates } from "@wwwuabot/ui/analysis/api";
import { useAnalysisChrome } from "./analysis-chrome";
import { AssessmentRun } from "@/pages/assessments/AssessmentRun";
import { useAssessments } from "@/pages/assessments/useAssessments";
import { ANALYSIS_PERSON_PATH, ANALYSIS_TESTS_PATH } from "@/app/routes";

const LENS_IDS = LENSES.map((lens) => lens.id).join(",");

export function AnalysisTestScreen(): ReactElement {
  const { key } = useParams();
  const { tests, results, peers, saving, error, submit, clearError } = useAssessments();
  const [ownDate, setOwnDate] = useState<string | null>(null);
  const test = tests.find((candidate) => candidate.key === key) ?? null;
  useAnalysisChrome(test?.title ?? "Тест");

  useEffect(() => {
    let cancelled = false;
    fetchMyDates()
      .then((list) => {
        const own = list.find((one) => one.type === "person" && one.date);
        if (!cancelled && own) setOwnDate(own.date);
      })
      .catch(() => {
        if (!cancelled) setOwnDate(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!key) {
    return (
      <div className="wb-page wb-page-scroll">
        <p className="an-empty">
          Такого тесту немає. <Link to={ANALYSIS_TESTS_PATH}>До списку тестів</Link>.
        </p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="wb-page wb-page-scroll">
        <p className="an-empty">
          Завантажуємо тест… або його ще немає. <Link to={ANALYSIS_TESTS_PATH}>До списку</Link>.
        </p>
      </div>
    );
  }

  // Профіль після тесту — власний: дата з профілю, усі системи й виміряні
  // відповіді. Якщо своєї дати немає, ведемо на крок даних, а не в порожній
  // екран.
  const resultHref = ownDate
    ? `${ANALYSIS_PERSON_PATH}/result?dates=${ownDate}&lenses=${LENS_IDS}&survey=1`
    : ANALYSIS_PERSON_PATH;

  return (
    <AssessmentRun
      test={test}
      history={results}
      peers={peers}
      saving={saving}
      error={error}
      submit={submit}
      onDone={clearError}
      resultHref={resultHref}
      resultLabel={ownDate ? "До мого профілю" : "Додати дату й побачити профіль"}
    />
  );
}
