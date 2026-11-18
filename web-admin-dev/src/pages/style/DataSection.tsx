/**
 * Дані й графіки: число, смуги, кільця й легенда.
 *
 * Назва блока — головна; число — другорядне, але кольором своєї серії. Колір
 * смуги, числа й підпису легенди збігається: це та сама серія.
 *
 * @module web-admin-dev/src/pages/style/DataSection
 */

import type { ReactElement } from "react";
import { KPI, LEGEND, RINGS, TRACKER_GROUPS } from "./demo-content";

export function DataSection(): ReactElement {
  return (
    <section className="sc-section">
      <div className="sc-sect-head">
        <h3 className="sc-sect-title">Дані й графіки</h3>
        <span className="sc-sect-note">
          кільце, смуги й число фарбуються серією, підписи — сірі
        </span>
      </div>

      <div className="sc-grid">
        {KPI.map((item) => (
          <article className="sc-card sc-motion-rise" key={item.label}>
            <div className="sc-card-head">
              <h4 className="sc-card-title">{item.label}</h4>
              <span className="wb-badge wb-badge-neutral">живе</span>
            </div>
            <p className={`sc-role sc-size-number sc-gap-tight sc-tone-data-${item.series}`}>
              {item.value}
            </p>
            <p className="sc-kpi-label">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="sc-grid">
        <article className="sc-card">
          <h4 className="sc-card-title">Трекери за групами</h4>
          <div className="sc-bars">
            {TRACKER_GROUPS.map((group) => (
              <div className={`sc-bar-row sc-series-${group.series}`} key={group.name}>
                <span className="sc-bar-name sc-tone-ink">{group.name}</span>
                <span className="sc-bar-track">
                  <span className={`sc-bar-fill sc-fill-${group.fill}`} />
                </span>
                <span className="sc-bar-value">{group.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="sc-card">
          <h4 className="sc-card-title">Розподіл</h4>
          <div className="sc-rings">
            {RINGS.map((ring) => (
              <div className="sc-ring-item" key={ring.label}>
                <span className={`sc-ring sc-series-${ring.series} sc-ring-p-${ring.percent}`} />
                <span className="sc-ring-text">
                  <span className="sc-tone-ink sc-size-label">{ring.label}</span>
                  <span className={`sc-size-label sc-tone-data-${ring.series}`}>{ring.value}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="sc-legend">
            {LEGEND.map((item) => (
              <span className={`sc-legend-item sc-series-${item.series}`} key={item.label}>
                <span className="sc-dot" />
                {item.label}
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
