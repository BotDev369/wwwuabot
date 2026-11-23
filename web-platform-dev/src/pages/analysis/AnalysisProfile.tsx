/**
 * Профіль: короткий огляд, провідні якості й 36 якостей по доменах. Розрахунок
 * і джерело кожної якості — тільки під розкриттям.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisProfile
 */

import { useMemo, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import {
  LENSES,
  anchorOf,
  levelLabel,
  readDossier,
  type QualityReading,
} from "@wwwuabot/shared/qualities";
import { readDates, readLenses, readSubject, readSurvey } from "@wwwuabot/ui/analysis/params";
import { useDossiers } from "@wwwuabot/ui/analysis/useDossiers";
import { useAnalysisChrome } from "./analysis-chrome";
import {
  ANALYSIS_COMPARE_PATH,
  ANALYSIS_MATCH_PATH,
  ANALYSIS_PATH,
  ANALYSIS_SYSTEMS_PATH,
  type AnalysisMode,
} from "@/app/routes";

interface AnalysisProfileProps {
  mode: AnalysisMode;
}

const ALL_LENSES = LENSES.map((lens) => lens.id);

const TITLES: Record<AnalysisMode, string> = {
  person: "Профіль",
  event: "Профіль події",
  compare: "Співставити",
};

/** Дата людини: `1980-03-03` → `3.03.1980`. */
function humanDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(day)}.${month}.${year}`;
}

function sourceName(sourceId: string): string {
  return LENSES.find((lens) => lens.id === sourceId)?.name ?? sourceId;
}

/** Провідні якості: найвищий рівень, далі — більше свідчень. */
function leading(readings: readonly QualityReading[]): QualityReading[] {
  return readings
    .filter((reading) => reading.level !== null)
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || b.claims.length - a.claims.length)
    .slice(0, 4);
}

function QualityRow({ reading }: { reading: QualityReading }): ReactElement {
  if (reading.claims.length === 0) {
    return (
      <li className="an-quality an-quality--empty">
        <span className="an-quality__name">{reading.quality.name}</span>
      </li>
    );
  }

  const label = reading.level === null ? "Різні відповіді" : levelLabel(reading.level);

  return (
    <li className="an-quality">
      <details className="an-quality__details">
        <summary className="an-quality__summary">
          <span className="an-quality__name">{reading.quality.name}</span>
          <span className="an-quality__level" data-level={reading.level ?? 0}>
            {label}
          </span>
          <Icon name="chevron-down" size={16} className="an-quality__caret" />
        </summary>

        <div className="an-quality__body">
          {reading.level !== null && (
            <p className="an-quality__anchor">{anchorOf(reading.quality, reading.level)}</p>
          )}

          {reading.claims.map((claim) => (
            <div className="an-claim" key={`${claim.sourceId}-${claim.level}-${claim.evidence}`}>
              <p className="an-claim__source">
                {sourceName(claim.sourceId)} · {levelLabel(claim.level)}
              </p>
              <p className="an-claim__evidence">{claim.evidence}</p>
              {claim.details && claim.details.length > 0 && (
                <details className="an-claim__details">
                  <summary>Розрахунок</summary>
                  <ol className="an-claim__steps">
                    {claim.details.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          ))}
        </div>
      </details>
    </li>
  );
}

export function AnalysisProfile({ mode }: AnalysisProfileProps): ReactElement {
  useAnalysisChrome(TITLES[mode]);
  const search = window.location.search;
  const dates = readDates(search);
  const subject = readSubject(search, dates.length);
  const chosen = readLenses(search);
  const lenses = chosen.length > 0 ? chosen : ALL_LENSES;
  const survey = readSurvey(search);
  const kinds = useMemo(
    () => dates.map(() => (mode === "event" ? "event" : "person")),
    [dates, mode],
  );
  const { dossiers, loading, error } = useDossiers(dates, kinds, lenses, survey);

  return (
    <div className="wb-page wb-page-scroll">
      <div className="an-profile">
        <div className="an-profile__tools">
          <a className="an-back" href={ANALYSIS_PATH}>
            <Icon name="arrow-left" size={16} />
            До розділів
          </a>
          {mode === "person" && dates.length > 0 && (
            <>
              <a
                className="an-back"
                href={`${ANALYSIS_COMPARE_PATH}?dates=${dates[0]}&labels=${encodeURIComponent(
                  subject.labels[0] ?? "",
                )}`}
              >
                <Icon name="compare" size={16} />
                Співставити з іншою людиною
              </a>
              <a
                className="an-back"
                href={`${ANALYSIS_MATCH_PATH}?dates=${dates[0]}&labels=${encodeURIComponent(
                  subject.labels[0] ?? "",
                )}`}
              >
                <Icon name="heart" size={16} />
                Підібрати роль
              </a>
            </>
          )}
        </div>

        {dates.length === 0 && <p className="an-empty">Немає дати для аналізу.</p>}

        {loading && <p className="an-empty">Рахуємо…</p>}
        {error && <p className="an-empty">{error}</p>}

        {!loading &&
          !error &&
          dossiers.map((dossier, index) => {
            const readings = readDossier(dossier.claims);
            const all = readings.flatMap((domain) => domain.qualities);
            const known = all.filter((reading) => reading.claims.length > 0).length;
            const top = leading(all);
            const name =
              subject.labels[index] || (dossier.kind === "event" ? "Подія" : `Людина ${index + 1}`);

            return (
              <article className="an-card" key={dossier.date}>
                <header className="an-profile__head">
                  <p className="an-profile__kicker">
                    {dossier.kind === "event" ? "Подія" : "Людина"}
                  </p>
                  <h1 className="an-profile__name">{name}</h1>
                  <p className="an-profile__meta">
                    {humanDate(dossier.date)} · {known} із 36 якостей
                  </p>
                </header>

                {top.length > 0 && (
                  <section className="an-section">
                    <h2 className="an-section__title">Провідні якості</h2>
                    <div className="an-leads">
                      {top.map((reading) => (
                        <div className="an-lead" key={reading.quality.id}>
                          <span className="an-lead__name">{reading.quality.name}</span>
                          <span className="an-lead__level">
                            {reading.level === null ? "Різні відповіді" : levelLabel(reading.level)}
                          </span>
                          <span className="an-lead__anchor">
                            {reading.level === null
                              ? reading.quality.definition
                              : anchorOf(reading.quality, reading.level)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="an-section">
                  <h2 className="an-section__title">Якості за доменами</h2>
                  {readings.map((domain) => (
                    <div className="an-domain" key={domain.domain.id}>
                      <h3 className="an-domain__title">
                        {domain.domain.name}
                        <span className="an-domain__count">
                          {domain.known} з {domain.qualities.length}
                        </span>
                      </h3>
                      <ul className="an-qualities">
                        {domain.qualities.map((reading) => (
                          <QualityRow key={reading.quality.id} reading={reading} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              </article>
            );
          })}

        <p className="an-foot">
          Кожен рівень має розрахунок і джерело — вони відкриваються під якістю.{" "}
          <Link to={ANALYSIS_SYSTEMS_PATH}>Системи й метод</Link>.
        </p>
      </div>
    </div>
  );
}
