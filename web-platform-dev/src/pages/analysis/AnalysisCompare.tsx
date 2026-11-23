/**
 * Співставлення 2+ людей на тому самому ядрі: що об'єднує, де різні опори й де
 * картина одного доповнює іншого. Оцінок «краще/гірше» тут немає — рівень
 * людини це те, що визначили системи, а не місце в рейтингу.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisCompare
 */

import { useMemo, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { plural, type PluralForms } from "@wwwuabot/shared/utils/plural";
import {
  LENSES,
  comparePeople,
  levelLabel,
  type CompareCell,
  type CompareQuality,
} from "@wwwuabot/shared/qualities";
import { readDates, readLenses, readSubject, readSurvey } from "@wwwuabot/ui/analysis/params";
import { useDossiers } from "@wwwuabot/ui/analysis/useDossiers";
import { useAnalysisChrome } from "./analysis-chrome";
import { ANALYSIS_PATH, ANALYSIS_COMPARE_PATH } from "@/app/routes";

const ALL_LENSES = LENSES.map((lens) => lens.id);
const QUALITIES: PluralForms = ["якість", "якості", "якостей"];

function lensName(sourceId: string): string {
  return LENSES.find((lens) => lens.id === sourceId)?.name ?? sourceId;
}

function cellText(cell: CompareCell): string {
  if (cell.state === "level" && cell.level !== null) return levelLabel(cell.level);
  if (cell.state === "unsettled") return "системи розійшлися";
  return "немає даних";
}

/** Рядок якості: назва й рівень кожної людини. */
function PairRow({ one }: { one: CompareQuality }): ReactElement {
  return (
    <li className="an-pair">
      <span className="an-pair__name">{one.quality.name}</span>
      <span className="an-pair__cells">
        {one.cells.map((cell) => (
          <span
            className="an-pair__cell"
            data-state={cell.state}
            key={`${cell.label}-${cell.state}`}
            title={`${cell.label}: ${cellText(cell)}`}
          >
            <span className="an-pair__who">{cell.label}</span>
            <span className="an-pair__level">{cellText(cell)}</span>
          </span>
        ))}
      </span>
    </li>
  );
}

function Section({
  title,
  lead,
  rows,
  empty,
}: {
  title: string;
  lead: string;
  rows: readonly CompareQuality[];
  empty: string;
}): ReactElement {
  return (
    <section className="an-section">
      <h2 className="an-section__title">{title}</h2>
      <p className="an-section__lead">{lead}</p>
      {rows.length === 0 ? (
        <p className="an-empty">{empty}</p>
      ) : (
        <ul className="an-pairs">
          {rows.map((one) => (
            <PairRow key={one.quality.id} one={one} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function AnalysisCompare(): ReactElement {
  useAnalysisChrome("Результат співставлення");
  const search = window.location.search;
  const dates = readDates(search);
  const subject = readSubject(search, dates.length);
  const chosen = readLenses(search);
  const lenses = chosen.length > 0 ? chosen : ALL_LENSES;
  const survey = readSurvey(search);
  const { dossiers, loading, error } = useDossiers(dates, subject.kinds, lenses, survey);

  const addHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("dates", dates.join(","));
    params.set("labels", subject.labels.join("|"));
    return `${ANALYSIS_COMPARE_PATH}?${params.toString()}`;
  }, [dates, subject.labels]);

  const result = useMemo(
    () =>
      comparePeople(
        dossiers.map((dossier, index) => ({
          label: subject.labels[index] || `Людина ${index + 1}`,
          claims: dossier.claims,
        })),
      ),
    [dossiers, subject.labels],
  );

  return (
    <div className="wb-page wb-page-scroll">
      <div className="an-compare">
        <a className="an-back" href={ANALYSIS_PATH}>
          <Icon name="arrow-left" size={16} />
          До розділів
        </a>

        <header className="an-hero an-hero--slim">
          <p className="an-hero__kicker">Співставити</p>
          <h1 className="an-hero__title">
            {dates.length >= 2 ? "Що вас об'єднує" : "Кого співставляємо?"}
          </h1>
          <p className="an-hero__lead">
            {dates.length >= 2
              ? `${dates.length} людини, ${result.compared} ${plural(result.compared, QUALITIES)} порівнюються в усіх. Різні рівні — це різні опори, а не оцінка.`
              : "Додайте ще одну дату — і побачите спільне, різні опори та прогалини."}
          </p>
        </header>

        {dates.length === 0 && <p className="an-empty">Немає дат для співставлення.</p>}
        {loading && <p className="an-empty">Рахуємо…</p>}
        {error && <p className="an-empty">{error}</p>}

        {!loading && !error && dates.length >= 2 && (
          <>
            <section className="an-section">
              <h2 className="an-section__title">Хто в співставленні</h2>
              <div className="an-covers">
                {result.people.map((person) => (
                  <article className="an-cover" key={person.label}>
                    <p className="an-cover__name">{person.label}</p>
                    <p className="an-cover__meta">{person.known} із 36 якостей</p>
                    <p className="an-cover__systems">
                      {person.systems.length === 0
                        ? "жодна система не дала свідчень"
                        : person.systems
                            .map((system) => `${lensName(system.sourceId)} · ${system.qualities}`)
                            .join(" · ")}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <Section
              title="Що об'єднує"
              lead="Якості, де в кожного рівень високий: спільна опора, на яку можна спертися."
              rows={result.shared}
              empty="Спільних високих якостей поки немає — додайте системи або ще одну людину."
            />

            <Section
              title="Де різні опори"
              lead="Рівні розходяться на два кроки й більше. Це не краще й не гірше — це різні способи діяти."
              rows={result.tension}
              empty="Різких розходжень немає: там, де є дані, рівні близькі."
            />

            <Section
              title="Де картина доповнюється"
              lead="Якість є не в усіх, або системи всередині людини розійшлися. Це не розбіжність між людьми — це межа даних."
              rows={result.partial}
              empty="Усі якості, про які є дані, узгоджені в кожного."
            />

            {result.domains.length > 0 && (
              <section className="an-section">
                <h2 className="an-section__title">Домени з найвищим збігом</h2>
                <p className="an-section__lead">
                  Частка спільних якостей домену, де рівні збігаються або різняться на один крок.
                </p>
                <div className="an-bars">
                  {result.domains.slice(0, 5).map((domain) => (
                    <div className="an-bar" key={domain.domain.id}>
                      <div className="an-bar__head">
                        <span className="an-bar__name">{domain.domain.name}</span>
                        <span className="an-bar__value">
                          {domain.agree} з {domain.compared}
                        </span>
                      </div>
                      <div className="an-bar__track">
                        <div
                          className="an-bar__fill"
                          style={{ width: `${Math.round(domain.agreement * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="an-section">
              <h2 className="an-section__title">Недостатньо даних</h2>
              <p className="an-section__lead">
                {result.missing.length === 0
                  ? "Кожна якість має хоч одне свідчення."
                  : `${result.missing.length} ${plural(result.missing.length, QUALITIES)} поки без свідчень у жодного з вас. Вони не рахуються ані збігом, ані розбіжністю.`}
              </p>
              <p className="an-compare__hint">
                Спільні якості видно тоді, коли системи обох дали рівень.{" "}
                <a href={addHref}>Додати людину</a>.
              </p>
            </section>
          </>
        )}

        <p className="an-foot">
          Рахунок той самий, що в профілі: 36 якостей, 12 доменів і джерела систем. Рейтингу тут
          немає — тільки те, що видно з даних.
        </p>
      </div>
    </div>
  );
}
