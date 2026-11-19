/**
 * Головна фічі: три входи, збережені люди й «як це працює» — обкладинка одного
 * розділу, а не меню з семи карток.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisHub
 */

import { useEffect, useState, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon, type IconName } from "@wwwuabot/shared";
import { LENSES } from "@wwwuabot/shared/qualities";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import { fetchMyDates } from "@wwwuabot/ui/analysis/api";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import {
  ANALYSIS_COMPARE_PATH,
  ANALYSIS_EVENT_PATH,
  ANALYSIS_PERSON_PATH,
  ANALYSIS_SYSTEMS_PATH,
  ANALYSIS_TESTS_PATH,
} from "@/app/routes";

const LENS_IDS = LENSES.map((lens) => lens.id).join(",");

interface Entry {
  readonly title: string;
  readonly lead: string;
  readonly icon: IconName;
  readonly tone: number;
  readonly to: string;
}

const ENTRIES: readonly Entry[] = [
  {
    title: "Людина",
    lead: "Характер, сильні сторони й зони ризику — за датою народження.",
    icon: "user",
    tone: 1,
    to: ANALYSIS_PERSON_PATH,
  },
  {
    title: "Подія",
    lead: "Тон, рушій і те, чим подія завершується — за її датою.",
    icon: "sparkles",
    tone: 3,
    to: ANALYSIS_EVENT_PATH,
  },
  {
    title: "Співставлення",
    lead: "Що об'єднує людей і де між ними напруга — без оцінок.",
    icon: "compare",
    tone: 2,
    to: ANALYSIS_COMPARE_PATH,
  },
];

const STEPS: readonly { title: string; text: string }[] = [
  { title: "Дата", text: "Одна дата — більше нічого не потрібно." },
  { title: "Системи", text: "Чотири традиції читають її незалежно." },
  { title: "Профіль", text: "36 якостей із рівнем і розрахунком кожної." },
];

/** Людська дата: `1980-03-03` → `3.03.1980`. */
function humanDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(day)}.${month}.${year}`;
}

function savedPeople(dates: readonly MyDate[]): MyDate[] {
  return dates.filter((one) => one.type === "person" && one.date).slice(0, 4);
}

export function AnalysisHub(): ReactElement {
  useScreenChrome({ title: "Аналіз людей та подій" });
  const navigate = useNavigate();
  const [people, setPeople] = useState<MyDate[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchMyDates()
      .then((list) => {
        if (!cancelled) setPeople(savedPeople(list));
      })
      .catch(() => {
        // Список збережених — допомога, а не умова входу: без нього головна
        // лишається робочою, тож помилка не перетворює екран на порожній.
        if (!cancelled) setPeople([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="wb-page wb-page-scroll">
      <div className="an-hub">
        <header className="an-hero">
          <p className="an-hero__kicker">Аналіз людей та подій</p>
          <h1 className="an-hero__title">Хто перед вами?</h1>
          <p className="an-hero__lead">
            Дата народження і ваші відповіді — два незалежні погляди на одні й ті самі 36 якостей.
          </p>
        </header>

        <nav className="an-entries" aria-label="Кого аналізуємо">
          {ENTRIES.map((entry) => (
            <button
              key={entry.title}
              type="button"
              className="an-entry"
              data-tone={entry.tone}
              onClick={() => navigate(entry.to)}
            >
              <span className="an-entry__icon" aria-hidden="true">
                <Icon name={entry.icon} size={22} />
              </span>
              <span className="an-entry__body">
                <span className="an-entry__title">{entry.title}</span>
                <span className="an-entry__lead">{entry.lead}</span>
              </span>
              <Icon name="chevron-right" size={18} />
            </button>
          ))}
        </nav>

        {people.length > 0 && (
          <section className="an-section">
            <h2 className="an-section__title">Мої люди</h2>
            <div className="an-people">
              {people.map((person) => (
                <Link
                  key={person.id}
                  className="an-person"
                  to={`${ANALYSIS_PERSON_PATH}/result?dates=${person.date}&labels=${encodeURIComponent(
                    person.name || "",
                  )}&lenses=${LENS_IDS}`}
                >
                  <span className="an-person__name">{person.name || "Без імені"}</span>
                  <span className="an-person__date">{humanDate(person.date)}</span>
                  <Icon name="chevron-right" size={16} />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="an-section">
          <h2 className="an-section__title">Як це працює</h2>
          <ol className="an-steps">
            {STEPS.map((step, index) => (
              <li className="an-step" key={step.title}>
                <span className="an-step__num">{index + 1}</span>
                <span className="an-step__body">
                  <span className="an-step__title">{step.title}</span>
                  <span className="an-step__text">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="an-tools">
          <Link className="an-tool" to={ANALYSIS_SYSTEMS_PATH}>
            <Icon name="book" size={18} />
            Системи аналізу
          </Link>
          <Link className="an-tool" to={ANALYSIS_TESTS_PATH}>
            <Icon name="growth" size={18} />
            Тести
          </Link>
        </div>

        <p className="an-foot">
          Рівень — це те, що визначила система, а не оцінка людини. Метод і розрахунок відкриті в
          кожному профілі.
        </p>
      </div>
    </div>
  );
}
