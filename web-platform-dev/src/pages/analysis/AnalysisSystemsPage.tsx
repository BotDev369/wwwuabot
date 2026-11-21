/**
 * Довідка «Системи аналізу»: чотири традиції, їхні показники й живий приклад
 * для обраної дати. Системи рівні: немає основної та додаткової.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisSystemsPage
 */

import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { BIG_FIVE } from "@wwwuabot/shared/assessments";
import { LENSES, MEASURED_NAME } from "@wwwuabot/shared/qualities";
import { useDossiers } from "@wwwuabot/ui/analysis/useDossiers";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { ANALYSIS_PATH, ANALYSIS_TESTS_PATH } from "@/app/routes";

const ALL_LENSES = LENSES.map((lens) => lens.id);

/** Сьогодні — робочий приклад: дата, яку людина впізнає без пояснень. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AnalysisSystemsPage(): ReactElement {
  useScreenChrome({ title: "Про системи аналізу" });
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
          <h1 className="an-hero__title">Про системи аналізу</h1>
          <p className="an-hero__lead">
            Кожна система окремо: що це, звідки взялася, де побутує, що дає й чого не знає.
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

                {lens?.history && (
                  <p className="an-system-card__gives">
                    <strong>Історія:</strong> {lens.history}
                  </p>
                )}

                {(system.source ?? lens?.source) && (
                  <p className="an-system-card__gives">
                    <strong>Засновники й канон:</strong> {system.source ?? lens?.source}
                  </p>
                )}

                {lens?.spread && (
                  <p className="an-system-card__gives">
                    <strong>Поширення:</strong> {lens.spread}
                  </p>
                )}

                {lens?.usage && (
                  <p className="an-system-card__gives">
                    <strong>Застосування:</strong> {lens.usage}
                  </p>
                )}

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

                {system.limits && system.limits.length > 0 && (
                  <p className="an-system-card__gives">
                    <strong>Чого не знає:</strong> {system.limits.join("; ")}.
                  </p>
                )}
              </article>
            );
          })}
        </div>

        <article className="an-system-card">
          <header className="an-system-card__head">
            <h2 className="an-system-card__name">{MEASURED_NAME}</h2>
            <span className="an-system-card__count">Тест, а не дата</span>
          </header>

          <p className="an-system-card__about">{BIG_FIVE.about}</p>
          <p className="an-system-card__gives">
            <strong>Що бере:</strong> відповіді людини на двадцять тверджень, по чотири на фактор.
          </p>
          <p className="an-system-card__gives">
            <strong>Чого не знає:</strong> того, чого людина про себе не сказала; це самооцінка, а
            не діагноз.
          </p>

          <Link className="an-tool" to={ANALYSIS_TESTS_PATH}>
            <Icon name="clipboard" size={16} />
            Пройти тестування
          </Link>
        </article>
      </div>
    </div>
  );
}
