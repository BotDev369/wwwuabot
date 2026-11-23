/**
 * Довідник якостей: профіль, домени й точкове визначення обраної якості.
 * «Визначити» рахує лише цю якість, а не весь портрет; результат зберігається
 * для профілю й повертається після перезавантаження.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisQualitiesPage
 */

import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { MEASURED_NAME, QUALITY_DOMAINS, type Quality } from "@wwwuabot/shared/qualities";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import { fetchDossiers, fetchMyDates } from "@wwwuabot/ui/analysis/api";
import { useAnalysisChrome } from "./analysis-chrome";
import { ANALYSIS_PATH, ANALYSIS_TESTS_PATH } from "@/app/routes";
import { AnalysisQualityEntry } from "./AnalysisQualityEntry";
import {
  qualitySystems,
  readStored,
  storageKeyFor,
  writeStored,
  type QualityProfile,
  type StoredMap,
} from "./analysis-quality-state";

/** Дата людини: `1980-03-03` → `3.03.1980`. */
function humanDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(day)}.${month}.${year}`;
}

function initialProfile(): QualityProfile {
  const params = new URLSearchParams(window.location.search);
  return {
    date: params.get("date") ?? "",
    kind: params.get("kind") === "event" ? "event" : "person",
    label: params.get("label") ?? "",
  };
}

export function AnalysisQualitiesPage(): ReactElement {
  useAnalysisChrome("Типові якості людей і подій");
  const [profile, setProfile] = useState<QualityProfile>(initialProfile);
  const [saved, setSaved] = useState<MyDate[]>([]);
  const [determined, setDetermined] = useState<StoredMap>(() => readStored(storageKeyFor(profile)));
  const [working, setWorking] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testHint, setTestHint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = storageKeyFor(profile);

  useEffect(() => {
    fetchMyDates()
      .then(setSaved)
      .catch(() => setSaved([]));
  }, []);

  /** Перехід на інший профіль разом із його збереженими визначеннями. */
  function applyProfile(next: QualityProfile): void {
    setProfile(next);
    setDetermined(readStored(storageKeyFor(next)));
    setWorking(null);
    setNotice(null);
    setTestHint(false);
    setError(null);
  }

  // Профіль лишається в адресі: reload повертає ту саму людину й ті самі
  // визначені якості, а не порожній довідник.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (profile.date) {
      url.searchParams.set("date", profile.date);
      url.searchParams.set("kind", profile.kind);
      if (profile.label) url.searchParams.set("label", profile.label);
      else url.searchParams.delete("label");
    } else {
      url.searchParams.delete("date");
      url.searchParams.delete("kind");
      url.searchParams.delete("label");
    }
    url.searchParams.delete("quality");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [profile]);

  /** Вибір саме цього запису, а не першого з такою датою. */
  const selectedId =
    saved.find(
      (one) =>
        one.date === profile.date &&
        (one.type === "event" ? "event" : "person") === profile.kind &&
        (!profile.label || one.name === profile.label),
    )?.id ?? "";

  function choose(value: string): void {
    const one = saved.find((item) => item.id === value);
    if (!one) {
      applyProfile({ date: "", kind: "person", label: "" });
      return;
    }
    applyProfile({
      date: one.date,
      kind: one.type === "event" ? "event" : "person",
      label: one.name,
    });
  }

  function chooseDate(value: string): void {
    applyProfile({ ...profile, date: value, label: "" });
  }

  async function determine(quality: Quality): Promise<void> {
    setNotice(null);
    setTestHint(false);
    setError(null);
    if (!profile.date) {
      document.querySelector<HTMLSelectElement>(".an-select")?.focus();
      setNotice("Спершу виберіть людину або дату.");
      return;
    }
    const systems = qualitySystems(quality.id);
    const dateSystems = systems.filter((id) => id !== "bigfive");
    const measured = systems.includes("bigfive");
    if (dateSystems.length === 0) {
      setTestHint(measured);
      setNotice(
        measured
          ? `«${quality.name}» визначає лише ${MEASURED_NAME}.`
          : `«${quality.name}» поки не визначає жодна система.`,
      );
      return;
    }

    setWorking(quality.id);
    try {
      const result = await fetchDossiers(
        [profile.date],
        profile.kind,
        dateSystems,
        false,
        quality.id,
      );
      const claims = (result.dossiers[0]?.claims ?? []).filter(
        (claim) => claim.qualityId === quality.id,
      );
      const next: StoredMap = {
        ...determined,
        [quality.id]: { claims, checkedAt: new Date().toISOString() },
      };
      setDetermined(next);
      writeStored(storageKey, next);
      if (claims.length === 0) {
        setTestHint(measured);
        setNotice(
          measured
            ? `Дата не дала значення для «${quality.name}».`
            : `Системи перевірені, але «${quality.name}» не визначено.`,
        );
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Помилка розрахунку");
    } finally {
      setWorking(null);
    }
  }

  const known = Object.values(determined).filter((one) => one.claims.length > 0).length;

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
              value={profile.date}
              max="2100-12-31"
              onChange={(event) => chooseDate(event.target.value)}
            />
          </label>

          {profile.date && (
            <p className="an-section__lead">
              {profile.label || (profile.kind === "event" ? "Подія" : "Людина")} ·{" "}
              {humanDate(profile.date)} · {known} із 36 якостей визначено.
            </p>
          )}

          {profile.kind === "event" && profile.date && (
            <p className="an-empty">Подія в ядрі ще не описана — нижче лишається довідник.</p>
          )}
          {notice && (
            <p className="an-empty" role="status">
              {notice}{" "}
              {testHint && (
                <>
                  <Link to={ANALYSIS_TESTS_PATH}>Пройти тест</Link>.
                </>
              )}
            </p>
          )}
          {error && (
            <p className="an-empty" role="alert">
              {error}
            </p>
          )}
        </section>

        {QUALITY_DOMAINS.map((domain) => {
          const count = domain.qualities.filter(
            (quality) => (determined[quality.id]?.claims.length ?? 0) > 0,
          ).length;
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
                <ul className="an-qualities">
                  {domain.qualities.map((quality) => (
                    <AnalysisQualityEntry
                      key={quality.id}
                      quality={quality}
                      record={determined[quality.id]}
                      profile={profile}
                      busy={working === quality.id}
                      onDetermine={(one) => void determine(one)}
                    />
                  ))}
                </ul>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
