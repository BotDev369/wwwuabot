/**
 * Підбір ролі на тому самому ядрі: опора, ризик і нейтральне для двох людей.
 * Роль — це пара, а не рейтинг: «опора» означає «є в кожного», «ризик» — «немає
 * ні в кого». Відсотків сумісності й оцінок людей тут немає.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisMatch
 */

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import {
  LENSES,
  MEASURED_NAME,
  MEASURED_SOURCE,
  ROLES,
  getRole,
  levelLabel,
  matchRole,
  type RoleId,
  type RolePersonReading,
  type RoleQualityView,
} from "@wwwuabot/shared/qualities";
import { isValidDate } from "@wwwuabot/shared/utils/mydate-helpers";
import { readDates, readLenses, readSubject, readSurvey } from "@wwwuabot/ui/analysis/params";
import { useDossiers } from "@wwwuabot/ui/analysis/useDossiers";
import { useAnalysisChrome } from "./analysis-chrome";
import { ANALYSIS_MATCH_PATH, ANALYSIS_PATH } from "@/app/routes";

const ALL_LENSES = LENSES.map((lens) => lens.id);
const ROLE_QUERY = "role";

interface Row {
  date: string;
  name: string;
}

function sourceName(sourceId: string): string {
  if (sourceId === MEASURED_SOURCE) return MEASURED_NAME;
  return LENSES.find((lens) => lens.id === sourceId)?.name ?? sourceId;
}

function matchHref(role: RoleId, dates: readonly string[], labels: readonly string[]): string {
  const params = new URLSearchParams();
  if (dates.length > 0) params.set("dates", dates.join(","));
  if (labels.some(Boolean)) params.set("labels", labels.join("|"));
  params.set(ROLE_QUERY, role);
  params.set("lenses", ALL_LENSES.join(","));
  return `${ANALYSIS_MATCH_PATH}?${params.toString()}`;
}

function personText(person: RolePersonReading): string {
  if (person.level !== null) return levelLabel(person.level);
  return person.unsettled ? "системи розійшлися" : "немає даних";
}

function sourcesText(person: RolePersonReading): string {
  if (person.sources.length === 0) return "—";
  return `${person.sources.map(sourceName).join(", ")} · ${person.sources.length}`;
}

function QualityRow({ view }: { view: RoleQualityView }): ReactElement {
  return (
    <li className="an-pair">
      <span className="an-pair__name">
        {view.quality.name}
        <span className="an-need">опора: {levelLabel(view.need.threshold)}</span>
      </span>
      <span className="an-pair__cells">
        {view.people.map((person) => (
          <span
            className="an-pair__cell"
            data-state={person.level === null ? "missing" : "level"}
            key={person.label}
          >
            <span className="an-pair__who">{person.label}</span>
            <span className="an-pair__level">{personText(person)}</span>
            <span className="an-pair__sources">{sourcesText(person)}</span>
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
  rows: readonly RoleQualityView[];
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
          {rows.map((view) => (
            <QualityRow key={view.quality.id} view={view} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RolePicker({ active }: { active: RoleId }): ReactElement {
  const navigate = useNavigate();
  const { search } = useLocation();
  const dates = readDates(search);
  const labels = readSubject(search, dates.length).labels;
  return (
    <div className="an-roles" role="group" aria-label="Роль">
      {ROLES.map((role) => (
        <button
          key={role.id}
          type="button"
          className="an-role"
          data-active={role.id === active}
          aria-pressed={role.id === active}
          onClick={() => navigate(matchHref(role.id, dates, labels))}
        >
          <Icon
            name={
              role.id === "partner"
                ? "heart"
                : role.id === "friend"
                  ? "users"
                  : role.id === "business"
                    ? "compare"
                    : "growth"
            }
            size={18}
          />
          <span className="an-role__name">{role.name}</span>
        </button>
      ))}
    </div>
  );
}

export function AnalysisMatch(): ReactElement {
  useAnalysisChrome("Підбір ролі");
  const navigate = useNavigate();
  const { search } = useLocation();
  const dates = readDates(search);
  const labels = readSubject(search, dates.length).labels;
  const role = getRole(new URLSearchParams(search).get(ROLE_QUERY));
  const chosen = readLenses(search);
  const lenses = chosen.length > 0 ? chosen : ALL_LENSES;
  const survey = readSurvey(search);
  const { dossiers, loading, error } = useDossiers(
    dates,
    dates.map(() => "person"),
    lenses,
    survey,
  );
  const [rows, setRows] = useState<Row[]>(() => {
    const initial = dates.slice(0, 2).map((date, index) => ({ date, name: labels[index] ?? "" }));
    while (initial.length < 2) initial.push({ date: "", name: "" });
    return initial;
  });

  const result = useMemo(
    () =>
      matchRole(
        role,
        dossiers.map((dossier, index) => ({
          label: labels[index] || `Людина ${index + 1}`,
          claims: dossier.claims,
        })),
      ),
    [dossiers, labels, role],
  );

  function update(index: number, patch: Partial<Row>): void {
    setRows((current) => current.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (!rows.every((row) => isValidDate(row.date))) return;
    navigate(
      matchHref(
        role.id,
        rows.map((row) => row.date),
        rows.map((row) => row.name.trim()),
      ),
    );
  }

  const ready = dates.length >= 2;

  return (
    <div className="wb-page wb-page-scroll">
      <div className="an-match">
        <a className="an-back" href={ANALYSIS_PATH}>
          <Icon name="arrow-left" size={16} />
          До розділів
        </a>

        <header className="an-hero an-hero--slim">
          <p className="an-hero__kicker">Роль у парі</p>
          <h1 className="an-hero__title">{ready ? role.name : "Під кого підбираємо?"}</h1>
          <p className="an-hero__lead">
            {ready
              ? role.lead
              : "Оберіть роль і дві дати. Покажемо, що для неї є опорою, а де бракує даних — без оцінок людей."}
          </p>
        </header>

        <RolePicker active={role.id} />

        {!ready && (
          <form className="an-setup an-setup--inline" onSubmit={submit}>
            <div className="an-rows">
              {rows.map((row, index) => (
                <div className="an-row" key={index}>
                  <label className="an-field">
                    <span className="an-field__label">Дата народження</span>
                    <input
                      className="an-date"
                      type="date"
                      value={row.date}
                      max="2100-12-31"
                      required
                      onChange={(event) => update(index, { date: event.target.value })}
                    />
                  </label>
                  <label className="an-field">
                    <span className="an-field__label">Ім'я</span>
                    <input
                      className="an-input"
                      type="text"
                      value={row.name}
                      placeholder={index === 0 ? "Ви" : "Друга людина"}
                      onChange={(event) => update(index, { name: event.target.value })}
                    />
                  </label>
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="wb-btn wb-btn-primary"
              disabled={!rows.every((row) => isValidDate(row.date))}
            >
              Показати
            </button>
          </form>
        )}

        {ready && loading && <p className="an-empty">Рахуємо…</p>}
        {ready && error && <p className="an-empty">{error}</p>}

        {ready && !loading && !error && (
          <>
            <section className="an-section">
              <h2 className="an-section__title">Хто в парі</h2>
              <div className="an-covers">
                {result.people.map((person) => (
                  <article className="an-cover" key={person.label}>
                    <p className="an-cover__name">{person.label}</p>
                    <p className="an-cover__meta">{person.known} із 36 якостей</p>
                  </article>
                ))}
              </div>
              <p className="an-match__hint">
                Роль — це пара: опора є, коли якість на потрібному рівні в кожного; ризик — коли
                низько в обох.
              </p>
            </section>

            <section className="an-section">
              <h2 className="an-section__title">Домени ролі</h2>
              <div className="an-domains">
                {result.domains.map((domain) => (
                  <span
                    className="an-domain-chip"
                    data-status={domain.status}
                    key={domain.domain.id}
                  >
                    <span className="an-domain-chip__name">{domain.domain.name}</span>
                    <span className="an-domain-chip__count">
                      {domain.support} опора · {domain.risk} ризик · {domain.unknown} без даних
                    </span>
                  </span>
                ))}
              </div>
            </section>

            <Section
              title="Опора"
              lead="Ці якості є в кожного на рівні, який потрібен ролі."
              rows={result.support}
              empty="Спільних опор поки немає — додайте системи або перевірте другу людину."
            />

            <Section
              title="Зона ризику"
              lead="Для ролі це важливо, але низько в обох — спільної опори немає ні в кого."
              rows={result.risk}
              empty="Спільних провалів немає: там, де є дані, хтось із пари якість тримає."
            />

            <Section
              title="Нейтрально"
              lead="Рівень є в обох, але нижче бажаного або в різних площинах — не опора й не прогалина."
              rows={result.neutral}
              empty="Немає якостей, які лишились би між опорою та ризиком."
            />

            <Section
              title="Немає даних"
              lead="Не всі системи дали рівень. Це не низький рівень і не ризик, а чесна прогалина."
              rows={result.unknown}
              empty="Кожна якість ролі має рівень в обох."
            />

            <p className="an-match__sources">
              Правила ролі: {role.sources.map((source) => source.title).join("; ")}.{" "}
              {role.sources.map((source) => source.note).join("; ")}.
            </p>
            <p className="an-match__hint">
              <Link to={matchHref(role.id, [], [])}>Змінити дати</Link> · рахунок той самий, що в
              профілі.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
