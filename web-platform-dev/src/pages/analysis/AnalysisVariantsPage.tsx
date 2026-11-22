/**
 * Три розкладки головної поруч, із підписами — щоб обрати очима, а не словами.
 *
 * Розмітка в усіх трьох та сама (`AnalysisHub`), різниця лише в `data-variant`
 * і стилях. Тому жодна сторінка фічі не змінюється: це вибір вигляду, а не
 * друга головна.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisVariantsPage
 */

import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAnalysisChrome } from "./analysis-chrome";
import { AnalysisHub, type AnalysisHubVariant } from "./AnalysisHub";
import { ANALYSIS_PATH, ANALYSIS_VARIANT_PATH } from "@/app/routes";

interface Option {
  readonly variant: AnalysisHubVariant;
  readonly note: string;
}

const OPTIONS: readonly Option[] = [
  { variant: 1, note: "Значок ліворуч, назва й користь праворуч — найкомпактніше." },
  {
    variant: 2,
    note: "Значок ліворуч, назва й користь праворуч — затверджений вигляд головної.",
  },
  { variant: 3, note: "Текст ліворуч, великий значок праворуч — найбільше схоже на банери." },
];

export function AnalysisVariantsPage(): ReactElement {
  useAnalysisChrome("Варіанти головної");

  return (
    <div className="wb-page wb-page-scroll">
      <div className="an-hub">
        <a className="an-back" href={ANALYSIS_PATH}>
          До розділів
        </a>

        <header className="an-hero an-hero--slim">
          <h1 className="an-hero__title" data-screen-title>
            Варіанти головної
          </h1>
          <p className="an-hero__lead">
            Той самий вміст, три різні розкладки. Відкрий кожен окремо або скажи номер.
          </p>
        </header>

        {OPTIONS.map((option) => (
          <section className="an-variant" key={option.variant}>
            <h2 className="an-variant__title">Варіант {option.variant}</h2>
            <p className="an-variant__note">{option.note}</p>
            <Link className="an-tool" to={ANALYSIS_VARIANT_PATH(option.variant)}>
              Відкрити варіант {option.variant}
            </Link>
            <div className="an-variant__frame">
              <AnalysisHub variant={option.variant} withHero={false} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
