/**
 * Одна якість досьє: рівень — якорем, розкриття — свідченнями. Якість без
 * свідчень лишається рядком «не знаємо», а розбіжність — розподілом, не
 * середнім.
 *
 * @module packages/ui/src/blocks/date-analysis/DossierQuality
 */

import { Icon } from "@wwwuabot/shared";
import {
  LENSES,
  anchorOf,
  levelLabel,
  type QualityLevel,
  type QualityReading,
} from "@wwwuabot/shared/qualities";
import { CONFLICT_LABEL, LAYER_LABELS, UNKNOWN_LABEL, confidenceWord } from "./dossier-texts";

const LEVELS: readonly QualityLevel[] = [1, 2, 3, 4, 5];

function sourceName(sourceId: string): string {
  return LENSES.find((lens) => lens.id === sourceId)?.name ?? sourceId;
}

export function DossierQuality({ reading }: { reading: QualityReading }) {
  const { quality, claims, summary, level, conflict, divergent } = reading;
  const spread = conflict || divergent;

  if (claims.length === 0) {
    return (
      <li className="wb-dossier-quality wb-dossier-quality--unknown">
        <span className="wb-dossier-quality__name">{quality.name}</span>
        <span className="wb-dossier-quality__unknown">{UNKNOWN_LABEL}</span>
      </li>
    );
  }

  const label = spread ? CONFLICT_LABEL : levelLabel(level ?? 3);
  const anchor = spread
    ? "Свідчення розходяться — показуємо обидва, без середнього."
    : anchorOf(quality, level ?? 3);

  return (
    <li className={`wb-dossier-quality${spread ? " wb-dossier-quality--conflict" : ""}`}>
      <details className="wb-dossier-quality__details">
        <summary className="wb-dossier-quality__summary">
          <span className="wb-dossier-quality__text">
            <span className="wb-dossier-quality__name">{quality.name}</span>
            <span className="wb-dossier-quality__anchor">{anchor}</span>
          </span>
          <span className="wb-dossier-quality__level" data-level={spread ? "conflict" : level}>
            {label}
          </span>
          <Icon name="chevron-down" size={16} className="wb-dossier-quality__caret" />
        </summary>

        <div className="wb-dossier-quality__body">
          <p className="wb-dossier-quality__definition">{quality.definition}</p>

          {spread && (
            <p className="wb-dossier-quality__positions">
              {claims
                .map((claim) => `${sourceName(claim.sourceId)} — ${levelLabel(claim.level)}`)
                .join(" · ")}
              . Різні лінзи читають різні мови дати, тому розбіжність не усереднюється.
            </p>
          )}

          <ul className="wb-dossier-claims">
            {claims.map((claim) => (
              <li
                key={`${claim.sourceId}:${claim.qualityId}:${claim.level}`}
                className="wb-dossier-claim"
              >
                <p className="wb-dossier-claim__head">
                  <span className="wb-dossier-claim__source">{sourceName(claim.sourceId)}</span>
                  <span
                    className={`wb-dossier-claim__layer wb-dossier-claim__layer--${claim.layer}`}
                  >
                    {LAYER_LABELS[claim.layer]}
                  </span>
                  <span className="wb-dossier-claim__level">{levelLabel(claim.level)}</span>
                </p>
                <p className="wb-dossier-claim__evidence">{anchorOf(quality, claim.level)}</p>
                <p className="wb-dossier-claim__evidence">{claim.evidence}</p>
                <p className="wb-dossier-claim__confidence">
                  Впевненість: {confidenceWord(claim.confidence)}
                </p>
              </li>
            ))}
          </ul>

          <div className="wb-dossier-distribution">
            {LEVELS.map((one) => (
              <span
                key={one}
                className="wb-dossier-distribution__cell"
                data-empty={summary.byLevel[one] === 0}
              >
                <span className="wb-dossier-distribution__count">{summary.byLevel[one]}</span>
              </span>
            ))}
          </div>
          <p className="wb-dossier-distribution__caption">Свідчення за рівнями 1–5</p>
        </div>
      </details>
    </li>
  );
}
