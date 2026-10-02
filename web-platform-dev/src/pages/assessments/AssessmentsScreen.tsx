/**
 * «Розвиток» — екран і проходження в одному місці.
 *
 * **Стан — у хуку, перемикання — за адресою.** Відкрита теста `/assessments`,
 * а відкрита `/assessments/who5` — проходження; тож «назад» у Telegram повертає
 * на список, а не виходить із розділу. Кнопка «ще раз» просто чистить
 * відповіді й лишає людину на місці, бо це той самий тест, а не інший екран.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentsScreen
 */

import { useMemo, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentRunPath } from "@/app/routes";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { AssessmentsPage } from "./AssessmentsPage";
import { AssessmentRun } from "./AssessmentRun";
import { useAssessments } from "./useAssessments";

export function AssessmentsScreen(): ReactElement {
  useScreenChrome({ title: "Розвиток" });
  const { key } = useParams();
  const navigate = useNavigate();
  const { tests, results, peers, loading, saving, error, submit, clearError } = useAssessments();
  const [started, setStarted] = useState<string | null>(null);

  // Тест береться з реєстру, а не з адреси: невідомий `key` — це «нема такого
  // екрана», а не спроба рахувати за тим, що в графіку.
  const activeKey = key ?? started;
  const test = useMemo(
    () => tests.find((candidate) => candidate.key === activeKey) ?? null,
    [tests, activeKey],
  );

  if (test) {
    return (
      <AssessmentRun
        test={test}
        history={results}
        peers={peers}
        saving={saving}
        error={error}
        submit={submit}
        onDone={clearError}
      />
    );
  }

  return (
    <AssessmentsPage
      tests={tests}
      results={results}
      loading={loading}
      onOpen={(testKey) => {
        setStarted(testKey);
        navigate(assessmentRunPath(testKey));
      }}
    />
  );
}
