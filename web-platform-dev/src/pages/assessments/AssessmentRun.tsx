/**
 * Проходження тесту — **одне питання на екран**.
 *
 * **Чому не всі п'ять одразу.** Шість варіантів на питання — це вже
 * тридцять рядків; разом вони перетворюються на форму, яку треба
 * «заповнити», а це змінює відповідь людини: вона починає відповідати на
 * загальний враження, а не на те, що відчуває. По одному — це розмова, а не
 * анкета.
 *
 * **Вибір одразу видно і його можна змінити.** Клік по варіанту не веде
 * далі — він лише позначає відповідь, а «далі» є окремою кнопкою: випадково
 * зачепити варіант не можна, а змінити думку — можна.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentRun
 */

import { useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import type { AssessmentRecord, AssessmentTest } from "@wwwuabot/shared/assessments";
import { validateAnswers } from "@wwwuabot/shared/assessments";
import { AssessmentResultCard } from "./AssessmentResultCard";

interface AssessmentRunProps {
  test: AssessmentTest;
  history: readonly AssessmentRecord[];
  saving: boolean;
  error: string | null;
  submit: (testKey: string, answers: readonly number[]) => Promise<AssessmentRecord>;
  onDone: () => void;
}

export function AssessmentRun({
  test,
  history,
  saving,
  error,
  submit,
  onDone,
}: AssessmentRunProps): ReactElement {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState<AssessmentRecord | null>(null);

  const item = test.items[step];
  const total = test.items.length;
  const chosen = answers[step];
  const isLast = step === total - 1;

  // Відповідь «заповнена настільки, наскільки дозволяє сервер» — той самий
  // `validateAnswers`, що й на сервері, тож кнопка «далі» ніколи не
  // відправить те, що сервер відкине.
  const progress = useMemo(() => Math.round((step / total) * 100), [step, total]);

  async function next(): Promise<void> {
    if (!isLast) {
      setStep((value) => value + 1);
      return;
    }
    const record = await submit(test.key, answers);
    setFinished(record);
  }

  if (finished) {
    return (
      <div className="wb-page wb-page-scroll">
        <div className="wb-page-head">
          <button
            type="button"
            className="wb-page-add"
            onClick={() => {
              setFinished(null);
              setStep(0);
              setAnswers([]);
              onDone();
            }}
            aria-label="Ще раз"
          >
            <Icon name="refresh" size={20} />
          </button>
          <h1 className="wb-page-title">{test.title}</h1>
        </div>
        <AssessmentResultCard
          test={test}
          record={finished}
          history={[finished, ...history.filter((item) => item.id !== finished.id)]}
        />
      </div>
    );
  }

  return (
    <div className="wb-page wb-page-scroll">
      <div className="wb-page-head">
        <button
          type="button"
          className="wb-page-add"
          onClick={() => (step === 0 ? navigate(-1) : setStep((value) => value - 1))}
          aria-label="Назад"
        >
          <Icon name="arrow-left" size={20} />
        </button>
        <h1 className="wb-page-title">{test.title}</h1>
      </div>

      <div className="wb-run">
        <p className="wb-run-progress">
          Запитання {step + 1} з {total} · {test.periodLabel}
        </p>
        <div
          className="wb-run-progress-track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="wb-run-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <p className="wb-run-question">{item.text}</p>

        <div className="wb-scale" role="group" aria-label={item.text}>
          {test.options.map((option) => {
            const active = chosen === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`wb-scale-btn${active ? " wb-scale-btn--active" : ""}`}
                aria-pressed={active}
                onClick={() =>
                  setAnswers((prev) => {
                    const nextAnswers = [...prev];
                    nextAnswers[step] = option.value;
                    return nextAnswers;
                  })
                }
              >
                <span className="wb-scale-dot" aria-hidden="true" />
                {option.label}
              </button>
            );
          })}
        </div>

        {error && <p className="wb-notice wb-notice--attention">{error}</p>}

        <button
          type="button"
          className="wb-btn wb-btn-primary"
          disabled={validateAnswers(test, answers) !== null || saving}
          onClick={() => void next()}
        >
          {saving ? "Зберігаю…" : isLast ? "Показати результат" : "Далі"}
        </button>
      </div>
    </div>
  );
}
