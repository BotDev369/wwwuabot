/**
 * Одна якість профілю: рівень — людським описом, розкриття — тим, що каже
 * кожна система, і **як саме вона це порахувала**. Розбіжність — двома
 * позиціями, не середнім. Ніяких лічильників і оцінок певності: людина читає
 * про себе, а не звіт про метод.
 *
 * @module packages/ui/src/blocks/date-analysis/DossierQuality
 */

import { Icon } from "@wwwuabot/shared";
import { LENSES, anchorOf, levelLabel, type QualityReading } from "@wwwuabot/shared/qualities";
import { CONFLICT_LABEL, LAYER_LABELS } from "./dossier-texts";

function sourceName(sourceId: string): string {
  return LENSES.find((lens) => lens.id === sourceId)?.name ?? sourceId;
}

export function DossierQuality({ reading }: { reading: QualityReading }) {
  const { quality, claims, level, conflict, divergent } = reading;
  const spread = conflict || divergent;

  if (claims.length === 0) {
    return (
      <li className="wb-dossier-quality wb-dossier-quality--empty">
        <span className="wb-dossier-quality__name">{quality.name}</span>
      </li>
    );
  }

  const label = spread ? CONFLICT_LABEL : levelLabel(level ?? 3);
  const anchor = spread ? "" : anchorOf(quality, level ?? 3);

  return (
    <li className={`wb-dossier-quality${spread ? " wb-dossier-quality--conflict" : ""}`}>
      <details className="wb-dossier-quality__details">
        <summary className="wb-dossier-quality__summary">
          <span className="wb-dossier-quality__text">
            <span className="wb-dossier-quality__name">{quality.name}</span>
            {anchor && <span className="wb-dossier-quality__anchor">{anchor}</span>}
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
            </p>
          )}

          <ul className="wb-dossier-claims">
            {claims.map((claim) => (
              <li
                key={`${claim.sourceId}:${claim.qualityId}:${claim.level}:${claim.evidence}`}
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
                <p className="wb-dossier-claim__evidence">{claim.evidence}</p>
                {!claim.evidence.includes(anchorOf(quality, claim.level)) && (
                  <p className="wb-dossier-claim__evidence">{anchorOf(quality, claim.level)}</p>
                )}
                {claim.details && claim.details.length > 0 && (
                  <details className="wb-dossier-claim__details">
                    <summary>Як ми це визначили</summary>
                    <ol className="wb-dossier-claim__steps">
                      {claim.details.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </li>
  );
}
