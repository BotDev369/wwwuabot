/**
 * Проходження тесту — **одне питання на екран**, у блоках за шкалами.
 *
 * **Чому не всі одразу.** Шість варіантів на питання — це вже тридцять рядків;
 * разом вони перетворюються на форму, яку треба «заповнити», а це змінює
 * відповідь людини: вона починає відповідати на загальне враження, а не на те,
 * що відчуває. По одному — це розмова, а не анкета.
 *
 * **Назва блока — на першому питанні шкали.** У тесті з двома шкалами шістнадцять
 * однакових питань без поділу виглядають як одне довге опитування, і людина
 * не розуміє, де вона. Тому перед першим питанням кожного блоку стоїть його
 * назва й одне речення про те, що він міряє.
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
import {
  scaleByKey,
  startsScale,
  type AssessmentRecord,
  type AssessmentTest,
  type PeerTallies,
} from "@wwwuabot/shared/assessments";
import { AssessmentResultCard } from "./AssessmentResultCard";
import { blockedReason } from "./assessment-view";

interface AssessmentRunProps {
  test: AssessmentTest;
  history: readonly AssessmentRecord[];
  /** Розподіл по смугах: скільки людей, без імен. */
  peers: PeerTallies;
  saving: boolean;
  error: string | null;
  submit: (testKey: string, answers: readonly number[]) => Promise<AssessmentRecord[]>;
  onDone: () => void;
}

export function AssessmentRun({
  test,
  history,
  peers,
  saving,
  error,
  submit,
  onDone,
}: AssessmentRunProps): ReactElement {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState<AssessmentRecord[] | null>(null);

  const item = test.items[step];
  const total = test.items.length;
  // Питання про вплив на життя має **інші** варіанти, ніж симптомні, тож
  // шкала береться з питання, а не з тесту за замовчуванням.
  const isImpact = item.countsTowardScore === false;
  const options = isImpact ? (test.impact?.options ?? test.options) : test.options;
  const chosen = answers[step];
  const isLast = step === total - 1;
  // Назва блока потрібна лише на першому питанні шкали: на решті це шум, а
  // висота екрана тут вирішальна.
  const block = item.scale ? scaleByKey(test, item.scale) : null;
  const showBlock = startsScale(test, step);

  // Кнопка «далі» дивиться **лише на поточне питання**: питання йдуть по одному,
  // тому вимога заповнити весь тест тут зробила б кнопку неактивною завжди.
  const blocked = blockedReason(test, answers, step);
  const progress = useMemo(() => Math.round((step / total) * 100), [step, total]);

  async function next(): Promise<void> {
    if (!isLast) {
      setStep((value) => value + 1);
      return;
    }
    setFinished(await submit(test.key, answers));
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
        <AssessmentResultCard test={test} records={finished} history={history} peers={peers} />
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
        <h1 className="wb-page-title wb-page-title--slim">{test.title}</h1>
        <span className="wb-run-count">
          {step + 1} / {total}
        </span>
      </div>

      <div className="wb-run">
        <div
          className="wb-run-progress-track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="wb-run-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Ім'я блока й рамка періоду живуть на першому питанні шкали: вони
            задають контекст для відповідей, а на решті шістнадцяти це шум. */}
        {showBlock && block && (
          <div className="wb-run-block">
            <p className="wb-run-block-title">{block.title}</p>
            <p className="wb-run-block-lead">{block.lead}</p>
          </div>
        )}
        {showBlock && isImpact && <p className="wb-run-period">{test.periodLabel}</p>}

        <p className="wb-run-question">
          {isImpact ? (test.impact?.prompt ?? item.text) : item.text}
        </p>

        <div className="wb-scale" role="group" aria-label={item.text}>
          {options.map((option) => {
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

        {/* **Мовчить, поки не вибрано.** Сіра плашка з акцентом усередині
            виглядає як кнопка, на яку можна натиснути, — тобто обіцяє
            перехід, якого не буде. Тому до вибору це просто контур, а не
            заповнена поверхня. */}
        <button
          type="button"
          className={`wb-btn ${blocked !== null ? "wb-btn-waiting" : "wb-btn-primary"}`}
          disabled={blocked !== null || saving}
          onClick={() => void next()}
        >
          {saving ? "Зберігаю…" : isLast ? "Показати результат" : "Далі"}
        </button>
      </div>
    </div>
  );
}
