/**
 * Один рядок довідника: акордеон якості, її опис, прояв, системи, збережені
 * свідчення й точкова дія «Визначити». Винесено зі сторінки, щоб вона не
 * переросла межу складності.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisQualityEntry
 */

import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import {
  LENSES,
  MEASURED_NAME,
  anchorOf,
  levelLabel,
  readQuality,
  type Quality,
  type QualityClaim,
} from "@wwwuabot/shared/qualities";
import { analysisStepPath } from "@/app/routes";
import { qualitySystems, type QualityProfile, type StoredQuality } from "./analysis-quality-state";

interface AnalysisQualityEntryProps {
  quality: Quality;
  record: StoredQuality | undefined;
  profile: QualityProfile;
  busy: boolean;
  onDetermine: (quality: Quality) => void;
}

function sourceName(sourceId: string): string {
  if (sourceId === "bigfive") return MEASURED_NAME;
  return LENSES.find((lens) => lens.id === sourceId)?.name ?? sourceId;
}

function profileHref(claims: readonly QualityClaim[], profile: QualityProfile): string {
  const lenses = [...new Set(claims.map((claim) => claim.sourceId))].filter(
    (id) => id !== "bigfive",
  );
  const params = new URLSearchParams();
  params.set("dates", profile.date);
  params.set("labels", profile.label);
  if (lenses.length > 0) params.set("lenses", lenses.join(","));
  if (claims.some((claim) => claim.sourceId === "bigfive")) params.set("survey", "1");
  return `${analysisStepPath(profile.kind, "result")}?${params.toString()}`;
}

export function AnalysisQualityEntry({
  quality,
  record,
  profile,
  busy,
  onDetermine,
}: AnalysisQualityEntryProps): ReactElement {
  const claims = record?.claims ?? [];
  const reading = readQuality(claims, quality);
  const systems = qualitySystems(quality.id);
  const measured = systems.includes("bigfive");
  const noSystem = systems.length === 0;
  const level = reading.level;
  const label =
    level !== null ? levelLabel(level) : claims.length > 0 ? "Різні відповіді" : "Не визначено";

  return (
    <li className="an-quality" data-quality-id={quality.id}>
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
            <strong>Плюс прояву:</strong> {anchorOf(quality, 5)}
          </p>
          <p className="an-quality__meaning">
            <strong>Мінус прояву:</strong> {anchorOf(quality, 1)}
          </p>

          <div className="an-quality__systems">
            <p className="an-quality__meaning">
              <strong>Системи:</strong>{" "}
              {systems.length > 0 ? systems.map(sourceName).join(", ") : "поки жодна"}.
            </p>
            {systems.length > 0 && (
              <ul className="an-quality__params">
                {LENSES.filter((lens) => systems.includes(lens.id)).map((lens) => (
                  <li key={lens.id}>
                    <strong>{lens.name}:</strong> {lens.rule}
                  </li>
                ))}
                {measured && (
                  <li>
                    <strong>{MEASURED_NAME}:</strong> п'ять факторів самооцінки.
                  </li>
                )}
              </ul>
            )}
          </div>

          {record && claims.length === 0 && (
            <p className="an-quality__hint">
              Системи перевірені, але рівня для цієї якості вони не дали.
            </p>
          )}

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
              <Link className="an-tool" to={profileHref(claims, profile)}>
                <Icon name="check" size={16} />
                Перевірити профіль
              </Link>
            )}
            {claims.length === 0 && (
              <button
                className="an-tool an-tool--action"
                type="button"
                onClick={() => onDetermine(quality)}
                disabled={busy || noSystem}
                aria-busy={busy}
              >
                <Icon name={busy ? "refresh" : "plus"} size={16} />
                {busy ? "Рахуємо…" : "Визначити"}
              </button>
            )}
            {noSystem && (
              <span className="an-quality__hint">Система ще не визначає цю якість.</span>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}
