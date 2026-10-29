/**
 * «Розвиток» — список входів: аналіз дат і тести самооцінки.
 *
 * **Рядок — це акордеон, і більше нічого.** Власник 28.10.2026 сказав прямо: на
 * сторінці не має бути ані балів, ані трендів, ані розбору — тільки згорнуті
 * підписи зі знаком і назвою. Розгорнутий рядок каже одним реченням, що
 * всередині, і дає кнопку «Відкрити»: усе інше живе на екрані самого тесту.
 *
 * **Згорнуто за замовчуванням.** Список відповідає на «що тут є», тож він
 * мусить уміщатися в екран без прокрутки; відкрите тіло під кожним рядком
 * робило б із нього полотно.
 *
 * **Один рядок — один факт про людину, і не більше:** скільки питань і коли
 * проходили востаннє. Бал тут не показується навмисно — число без шкали, смуги
 * й тренду читається як вирок, а не як «повернись і подивись».
 *
 * Шлях власний (`/assessments`), а не `slug` рядка `scenarios`: список
 * складається з реєстру тестів і даних людини (таблиця `assessment_results`), а
 * не з `page_data` (AGENTS.md §7).
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentsPage
 */

import { useMemo, type ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import type { AssessmentRecord, AssessmentTest } from "@wwwuabot/shared/assessments";
import { formatDay } from "@wwwuabot/shared/utils/datetime";
import { plural, type PluralForms } from "@wwwuabot/shared/utils/plural";
import { CollapsibleSection } from "@wwwuabot/ui/blocks/collapsible-section";
import { latestByScale } from "./assessment-view";
import { ASSESSMENTS_ROUTE } from "@/app/routes";

const QUESTIONS: PluralForms = ["питання", "питання", "питань"];

interface AssessmentsPageProps {
  tests: readonly AssessmentTest[];
  results: readonly AssessmentRecord[];
  loading: boolean;
  onOpen: (testKey: string) => void;
  onOpenDates: () => void;
}

/** Рядок списку: усе, що потрібне акордеону, і нічого понад те. */
interface Entry {
  readonly key: string;
  readonly title: string;
  readonly icon: IconName;
  /** Одне речення про те, що всередині. */
  readonly lead: string;
  /** Факт про людину (скільки питань, коли проходила) — або `null`. */
  readonly note: string | null;
  readonly open: () => void;
}

/** Питання, які людина справді проходить: питання про вплив не рахується. */
function questionCount(test: AssessmentTest): number {
  return test.items.filter((item) => item.countsTowardScore !== false).length;
}

/**
 * Коли людина проходила тест востаннє — **за найновішим рядком будь-якої його
 * шкали**. У тесті з двома шкалами рядки йдуть одним проходженням, тож питати
 * треба обидві: інакше дата зникла б, щойно одна шкала записалась пізніше.
 */
function lastPassed(latest: Map<string, AssessmentRecord>, test: AssessmentTest): string | null {
  const dates = test.scales
    .map((scale) => latest.get(`${test.key}:${scale.key}`)?.createdAt)
    .filter((date): date is string => date !== undefined)
    .sort();
  const last = dates[dates.length - 1];
  return last ? formatDay(last) : null;
}

export function AssessmentsPage({
  tests,
  results,
  loading,
  onOpen,
  onOpenDates,
}: AssessmentsPageProps): ReactElement {
  const latest = useMemo(() => latestByScale(results), [results]);

  const entries: Entry[] = [
    {
      key: "dates",
      title: "Аналіз дат",
      icon: "my-dates",
      lead: "Ваші дати, їхнє порівняння й таблиця аналізу — за тими даними, що ви вже зберегли.",
      note: null,
      open: onOpenDates,
    },
    ...tests.map((test) => {
      const passed = lastPassed(latest, test);
      const questions = `${questionCount(test)} ${plural(questionCount(test), QUESTIONS)}`;
      return {
        key: test.key,
        title: test.title,
        icon: test.icon,
        lead: test.lead,
        note: passed ? `${questions} · востаннє ${passed}` : questions,
        open: () => onOpen(test.key),
      };
    }),
  ];

  return (
    <div className="wb-page wb-page-scroll">
      {/* Список є завжди: аналіз дат не залежить від реєстру тестів, тож
          чекати на нього людина не мусить. Контейнер і рядок — ті самі
          кирпичики, що в «Сервісах»: екран не має власної геометрії списку. */}
      <div className="wb-menu-list">
        {entries.map((entry) => (
          <CollapsibleSection key={entry.key} title={entry.title} icon={entry.icon} surface>
            <div className="wb-test-body">
              <p className="wb-test-lead">{entry.lead}</p>
              {entry.note && <p className="wb-test-meta">{entry.note}</p>}
              <button type="button" className="wb-btn wb-btn-primary" onClick={entry.open}>
                Відкрити
              </button>
            </div>
          </CollapsibleSection>
        ))}
      </div>

      {loading && <p className="wb-test-lead">Завантаження тестів…</p>}

      {!loading && tests.length === 0 && (
        <div className="wb-empty">
          <Icon name="progress" size={24} />
          <p className="wb-empty-text">Тут поки немає жодного тесту.</p>
        </div>
      )}

      <p className="wb-source">
        Це самооцінка, а не діагноз. Результати приватні: їх не видно у публічному профілі й ніде,
        крім «Розвитку». Адреса розділу — {ASSESSMENTS_ROUTE}.
      </p>
    </div>
  );
}
