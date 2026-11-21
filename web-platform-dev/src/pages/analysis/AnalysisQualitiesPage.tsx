/**
 * Довідник якостей: кожна якість із описом, проявом у високому й низькому
 * рівні, системами, що її визначають, і кнопкою «Визначити». Якщо дату вже
 * обрано, тут видно порахований рівень і докази систем.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisQualitiesPage
 */

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import {
  LENSES,
  LENS_QUALITIES,
  MEASURED_NAME,
  MEASURED_QUALITIES,
  QUALITY_DOMAINS,
  anchorOf,
  levelLabel,
  readDossier,
  type Quality,
  type QualityClaim,
  type QualityReading,
} from "@wwwuabot/shared/qualities";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import { fetchMyDates } from "@wwwuabot/ui/analysis/api";
import { useDossiers } from "@wwwuabot/ui/analysis/useDossiers";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { ANALYSIS_PATH, ANALYSIS_PERSON_PATH, analysisStepPath } from "@/app/routes";

const ALL_LENSES = LENSES.map((lens) => lens.id);

type Kind = "person" | "event";

interface Picked {
  date: string;
  kind: Kind;
  label: string;
}

/** Дата людини: `1980-03-03` → `3.03.1980`. */
function humanDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(day)}.${month}.${year}`;
}

function sourceName(sourceId: string): string {
  if (sourceId === "bigfive") return MEASURED_NAME;
  return LENSES.find((lens) => lens.id === sourceId)?.name ?? sourceId;
}

/** Системи, які взагалі можуть назвати цю якість. */
function systemsOf(qualityId: string): readonly string[] {
  const ids = LENSES.filter((lens) => LENS_QUALITIES[lens.id]?.includes(qualityId)).map(
    (lens) => lens.id,
  );
  if (MEASURED_QUALITIES.includes(qualityId)) ids.push("bigfive");
  return ids;
}

/** Куди веде «Визначити»: з датою — у вибір систем, без неї — у вибір дати. */
function defineHref(qualityId: string, picked: Picked): string {
  if (!picked.date) return `${ANALYSIS_PERSON_PATH}?quality=${encodeURIComponent(qualityId)}`;
  const all = systemsOf(qualityId);
  const systems = all.filter((id) => id !== "bigfive");
  const params = new URLSearchParams();
  params.set("dates", picked.date);
  params.set("labels", picked.label);
  params.set("quality", qualityId);
  if (systems.length > 0) params.set("lenses", systems.join(","));
  if (all.includes("bigfive")) params.set("survey", "1");
  return `${analysisStepPath(picked.kind, "systems")}?${params.toString()}`;
}

function profileHref(claims: readonly QualityClaim[], picked: Picked): string {
  const lenses = [...new Set(claims.map((claim) => claim.sourceId))].filter(
    (id) => id !== "bigfive",
  );
  const params = new URLSearchParams();
  params.set("dates", picked.date);
  params.set("labels", picked.label);
  if (lenses.length > 0) params.set("lenses", lenses.join(","));
  if (claims.some((claim) => claim.sourceId === "bigfive")) params.set("survey", "1");
  return `${analysisStepPath(picked.kind, "result")}?${params.toString()}`;
}

export function AnalysisQualitiesPage(): ReactElement {
  useScreenChrome({ title: "Типові якості людей і подій" });
  const [picked, setPicked] = useState<Picked>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      date: params.get("date") ?? "",
      kind: params.get("kind") === "event" ? "event" : "person",
      label: params.get("label") ?? "",
    };
  });
  const [saved, setSaved] = useState<MyDate[]>([]);

  useEffect(() => {
    fetchMyDates()
      .then(setSaved)
      .catch(() => setSaved([]));
  }, []);

  const { dossiers, loading, error } = useDossiers(
    picked.date ? [picked.date] : [],
    [picked.kind],
    ALL_LENSES,
    false,
  );
  const dossier = dossiers[0];

  const readings = useMemo(() => (dossier ? readDossier(dossier.claims) : null), [dossier]);
  const known = readings ? readings.reduce((sum, domain) => sum + domain.known, 0) : 0;
  const byQuality = useMemo(() => {
    const map = new Map<string, QualityReading>();
    for (const domain of readings ?? []) {
      for (const reading of domain.qualities) map.set(reading.quality.id, reading);
    }
    return map;
  }, [readings]);

  /** Вибір саме цього запису, а не першого з такою датою. */
  const selectedId =
    saved.find(
      (one) =>
        one.date === picked.date &&
        (one.type === "event" ? "event" : "person") === picked.kind &&
        (!picked.label || one.name === picked.label),
    )?.id ?? "";

  function choose(value: string): void {
    const one = saved.find((item) => item.id === value);
    if (!one) {
      setPicked({ date: "", kind: "person", label: "" });
      return;
    }
    setPicked({
      date: one.date,
      kind: one.type === "event" ? "event" : "person",
      label: one.name,
    });
  }

  function renderQuality(quality: Quality): ReactElement {
    const reading = byQuality.get(quality.id);
    const claims = reading?.claims ?? [];
    const systems = systemsOf(quality.id);
    const measured = systems.includes("bigfive");
    const level = reading?.level ?? null;
    const label =
      level === null ? (claims.length > 0 ? "Різні відповіді" : "Не визначено") : levelLabel(level);

    return (
      <li className="an-quality" key={quality.id}>
        <details className="an-quality__details">
          <summary className="an-quality__summary">
            <span className="an-quality__name">{quality.name}</span>
            <span className="an-quality__level" data-level={level ?? 0}>
              {label}
            </span>
            <Icon name="chevron-down" size={16} className="an-quality__caret" />
          </summary>

          <div className="an-quality__body">
            <p className="an-quality__meaning">
              <strong>Що це:</strong> {quality.definition}
            </p>
            <p className="an-quality__meaning">
              <strong>Проявляється високо:</strong> {anchorOf(quality, 5)}
            </p>
            <p className="an-quality__meaning">
              <strong>Проявляється низько:</strong> {anchorOf(quality, 1)}
            </p>

            <div className="an-quality__systems">
              <p className="an-quality__meaning">
                <strong>Визначають:</strong>{" "}
                {systems.length > 0 ? systems.map(sourceName).join(", ") : "поки жодна система"}.
              </p>
              {systems.length > 0 && (
                <details className="an-claim__details">
                  <summary>Які параметри</summary>
                  <ul className="an-claim__steps">
                    {LENSES.filter((lens) => systems.includes(lens.id)).map((lens) => (
                      <li key={lens.id}>
                        {lens.name}: {lens.rule}
                      </li>
                    ))}
                    {measured && <li>{MEASURED_NAME}: п'ять факторів самооцінки.</li>}
                  </ul>
                </details>
              )}
            </div>

            {claims.map((claim) => (
              <div className="an-claim" key={`${claim.sourceId}-${claim.evidence}`}>
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

            <div className="an-tools">
              {claims.length > 0 && (
                <Link className="an-tool" to={profileHref(claims, picked)}>
                  <Icon name="check" size={16} />
                  Перевірити профіль
                </Link>
              )}
              <Link className="an-tool" to={defineHref(quality.id, picked)}>
                <Icon name="plus" size={16} />
                Визначити
              </Link>
            </div>
          </div>
        </details>
      </li>
    );
  }

  return (
    <div className="wb-page wb-page-scroll">
      <div className="an-hub">
        <a className="an-back" href={ANALYSIS_PATH}>
          <Icon name="arrow-left" size={16} />
          До розділів
        </a>

        <header className="an-hero an-hero--slim">
          <h1 className="an-hero__title">Типові якості людей і подій</h1>
          <p className="an-hero__lead">
            Що це, як проявляється у високому й низькому рівні та які системи це визначають.
          </p>
        </header>

        <section className="an-section">
          <label className="an-field">
            <span className="an-field__label">Кого показуємо</span>
            <select
              className="an-select"
              value={selectedId}
              onChange={(event) => choose(event.target.value)}
            >
              <option value="">Ще нікого — показуємо довідник</option>
              {saved.map((one) => (
                <option key={one.id} value={one.id}>
                  {one.type === "event" ? "Подія" : "Людина"} · {one.name || humanDate(one.date)}
                </option>
              ))}
            </select>
          </label>

          <label className="an-field an-field--inline">
            <span className="an-field__label">Або дата</span>
            <input
              className="an-date"
              type="date"
              value={picked.date}
              max="2100-12-31"
              onChange={(event) =>
                setPicked((current) => ({ ...current, date: event.target.value, label: "" }))
              }
            />
          </label>

          {picked.date && (
            <p className="an-section__lead">
              {picked.label || (picked.kind === "event" ? "Подія" : "Людина")} ·{" "}
              {humanDate(picked.date)} · {known} із 36 якостей визначено.
            </p>
          )}

          {loading && <p className="an-empty">Рахуємо…</p>}
          {error && <p className="an-empty">{error}</p>}
          {dossier?.note === "event-not-modelled" && (
            <p className="an-empty">Подія в ядрі ще не описана — нижче лишається довідник.</p>
          )}
        </section>

        {QUALITY_DOMAINS.map((domain) => {
          const count = readings?.find((one) => one.domain.id === domain.id)?.known ?? 0;
          return (
            <details className="an-fold" key={domain.id}>
              <summary className="an-fold__summary">
                <span className="an-fold__title">{domain.name}</span>
                <span className="an-fold__count">
                  {count} з {domain.qualities.length}
                </span>
                <Icon name="chevron-down" size={18} className="an-quality__caret" />
              </summary>
              <div className="an-fold__body">
                <ul className="an-qualities">{domain.qualities.map(renderQuality)}</ul>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
