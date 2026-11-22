/**
 * Головна фічі — вітрина шести розділів, кожен з яких відкривається. Даних
 * людини тут немає: перший вхід нічого про неї не знає.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisHub
 */

import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "@wwwuabot/shared";
import { ANALYSIS_TITLE, useAnalysisChrome } from "./analysis-chrome";
import {
  ANALYSIS_COMPARE_PATH,
  ANALYSIS_PEOPLE_PATH,
  ANALYSIS_PERSON_PATH,
  ANALYSIS_QUALITIES_PATH,
  ANALYSIS_SYSTEMS_PATH,
  ANALYSIS_TESTS_PATH,
} from "@/app/routes";

interface Section {
  readonly title: string;
  readonly lead: string;
  readonly icon: IconName;
  readonly tone: number;
  readonly to: string;
}

/** Шість розділів фічі в тому порядку, у якому людина про них думає. */
const SECTIONS: readonly Section[] = [
  {
    title: "Про системи аналізу",
    lead: "Тестування, астрологія, нумерологія — що вони кажуть і звідки.",
    icon: "book",
    tone: 1,
    to: ANALYSIS_SYSTEMS_PATH,
  },
  {
    title: "Типові якості людей і подій",
    lead: "Усі риси людини з описами, проявами «+» і «−» та джерелами.",
    icon: "layers",
    tone: 2,
    to: ANALYSIS_QUALITIES_PATH,
  },
  {
    title: "Аналізувати за датою",
    lead: "Що можна прочитати з дати народження і звідки це взялося.",
    icon: "calendar",
    tone: 3,
    to: ANALYSIS_PERSON_PATH,
  },
  {
    title: "Пройти тестування",
    lead: "Короткі питання про вас і відповіді, які додаються до дати.",
    icon: "clipboard",
    tone: 1,
    to: ANALYSIS_TESTS_PATH,
  },
  {
    title: "Співставити",
    lead: "Двоє людей або людина й подія — видно, де збіглося.",
    icon: "compare",
    tone: 2,
    to: ANALYSIS_COMPARE_PATH,
  },
  {
    title: "Люди і події",
    lead: "Збережені люди, події та групи: можна змінити або видалити.",
    icon: "users",
    tone: 3,
    to: ANALYSIS_PEOPLE_PATH,
  },
];

/** Три розкладки головної: та сама розмітка, різне CSS. */
export type AnalysisHubVariant = 1 | 2 | 3;

interface AnalysisHubProps {
  /** Яка розкладка: 1 — плитка, 2 — затверджений рядок V2, 3 — значок праворуч. */
  variant?: AnalysisHubVariant;
  /** `false` — без шапки: так варіанти стоять поруч на сторінці порівняння. */
  withHero?: boolean;
}

export function AnalysisHub({ variant = 2, withHero = true }: AnalysisHubProps = {}): ReactElement {
  // Шапка належить платформі, а не одній фічі: шість розділів нижче —
  // рівноправні входи, і жоден не називає весь застосунок. `hero` каже
  // хедеру не дублювати назву, поки її видно великою на сторінці.
  useAnalysisChrome(ANALYSIS_TITLE, { hero: withHero, enabled: withHero });

  return (
    <div className="wb-page wb-page-scroll">
      <div className="an-hub" data-variant={variant}>
        {withHero && (
          <header className="an-hero an-hero--plain">
            <h1 className="an-hero__title" data-screen-title>
              {ANALYSIS_TITLE}
            </h1>
            <p className="an-hero__lead">Пізнай себе, оточуючих та події.</p>
          </header>
        )}

        <nav className="an-entries" aria-label="Розділи аналізу">
          {SECTIONS.map((section) => (
            <Link key={section.title} className="an-entry" data-tone={section.tone} to={section.to}>
              <span className="an-entry__icon" aria-hidden="true">
                <Icon name={section.icon} size={40} />
              </span>
              <span className="an-entry__body">
                <span className="an-entry__title">{section.title}</span>
                <span className="an-entry__lead">{section.lead}</span>
              </span>
              <span className="an-entry__chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
