/**
 * «Розрахунки й системи»: показники, які можна звірити самостійно, і межі
 * системи — без них традиція виглядала б як прилад.
 *
 * @module packages/ui/src/blocks/date-analysis/DossierCalculations
 */

import type { SystemRead } from "./api";

export function DossierCalculations({ systems }: { systems: readonly SystemRead[] }) {
  if (systems.length === 0) return null;

  return (
    <section className="wb-calc">
      <h4 className="wb-calc__title">Розрахунки й системи</h4>
      <p className="wb-calc__lead">
        Ось що кожна система взяла з дати. Це можна перевірити самостійно — і саме з цих показників
        вийшли рівні якостей вище.
      </p>

      {systems.map((system) => (
        <details className="wb-calc__system" key={system.id} open>
          <summary className="wb-calc__summary">
            <span className="wb-calc__name">{system.name}</span>
            <span className="wb-calc__count">{system.parameters.length} показників</span>
          </summary>

          {system.about && <p className="wb-calc__about">{system.about}</p>}

          <dl className="wb-calc__list">
            {system.parameters.map((parameter) => (
              <div className="wb-calc__row" key={parameter.label}>
                <dt className="wb-calc__label">{parameter.label}</dt>
                <dd className="wb-calc__value">{parameter.value}</dd>
              </div>
            ))}
          </dl>

          {system.gives && system.gives.length > 0 && (
            <p className="wb-calc__scope">
              <strong>Що бере з дати:</strong> {system.gives.join("; ")}.
            </p>
          )}
          {system.limits && system.limits.length > 0 && (
            <p className="wb-calc__scope">
              <strong>Чого не знає:</strong> {system.limits.join("; ")}.
            </p>
          )}
          {system.source && <p className="wb-calc__source">Канон: {system.source}</p>}
        </details>
      ))}
    </section>
  );
}
