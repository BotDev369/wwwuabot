/**
 * Довідка «Системи аналізу»: чотири традиції, їхні показники й живий приклад
 * для обраної дати. Системи рівні: немає основної та додаткової.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisSystemsPage
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { LENSES } from "@wwwuabot/shared/qualities";
import { useDossiers } from "@wwwuabot/ui/analysis/useDossiers";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { ANALYSIS_PATH } from "@/app/routes";

const ALL_LENSES = LENSES.map((lens) => lens.id);

/** Сьогодні — робочий приклад: дата, яку людина впізнає без пояснень. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AnalysisSystemsPage(): ReactElement {
  useScreenChrome({ title: "Системи аналізу" });
  const [date, setDate] = useState(today);
  const { dossiers, loading, error } = useDossiers([date], ["person"], ALL_LENSES, false);
  const systems = dossiers[0]?.systems ?? [];

  return (
    <div className="wb-page wb-page-scroll">
      <div className="an-hub">
        <a className="an-back" href={ANALYSIS_PATH}>
          <Icon name="arrow-left" size={16} />
          До аналізу
        </a>

        <header className="an-hero an-hero--slim">
          <h1 className="an-hero__title">Системи аналізу</h1>
          <p className="an-hero__lead">
            Чотири традиції читають одну дату незалежно. Ось що кожна бере й що з цього виходить.
          </p>
        </header>

        <label className="an-field an-field--inline">
          <span className="an-field__label">Приклад для дати</span>
          <input
            className="an-input"
            type="date"
            value={date}
            max="2100-12-31"
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        {loading && <p className="an-empty">Рахуємо…</p>}
        {error && <p className="an-empty">{error}</p>}

        <div className="an-system-list">
          {systems.map((system) => {
            const lens = LENSES.find((one) => one.id === system.id);
            return (
              <article className="an-system-card" key={system.id}>
                <header className="an-system-card__head">
                  <h2 className="an-system-card__name">{system.name}</h2>
                  <span className="an-system-card__count">
                    {system.parameters.length} показників
                  </span>
                </header>

                <p className="an-system-card__about">{system.about ?? lens?.about ?? lens?.rule}</p>

                <dl className="an-params">
                  {system.parameters.map((parameter) => (
                    <div className="an-param" key={parameter.label}>
                      <dt className="an-param__label">{parameter.label}</dt>
                      <dd className="an-param__value">{parameter.value}</dd>
                    </div>
                  ))}
                </dl>

                {system.gives && system.gives.length > 0 && (
                  <p className="an-system-card__gives">
                    <strong>Що бере з дати:</strong> {system.gives.join("; ")}.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
