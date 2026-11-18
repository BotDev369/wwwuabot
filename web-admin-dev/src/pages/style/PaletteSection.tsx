/**
 * Палітра: п’ять класів кольору, які є в продукті.
 *
 * Акцент — дія, `data-*` — серії даних, `data-0` — нейтральне, статуси —
 * зміст. Сірого тут два: `--text-muted` і `--data-0`.
 *
 * @module web-admin-dev/src/pages/style/PaletteSection
 */

import type { ReactElement } from "react";

const SWATCHES = [
  { name: "Серія 1", className: "sc-swatch-data-1" },
  { name: "Серія 2", className: "sc-swatch-data-2" },
  { name: "Серія 3", className: "sc-swatch-data-3" },
  { name: "Серія 4", className: "sc-swatch-data-4" },
  { name: "Серія 5", className: "sc-swatch-data-5" },
  { name: "Серія 6", className: "sc-swatch-data-6" },
  { name: "Нейтральна", className: "sc-swatch-data-0" },
  { name: "Другорядний текст", className: "sc-swatch-muted" },
  { name: "Акцент · дія", className: "sc-swatch-accent" },
  { name: "Успіх", className: "sc-swatch-green" },
  { name: "Увага", className: "sc-swatch-yellow" },
  { name: "Небезпека", className: "sc-swatch-red" },
] as const;

export function PaletteSection(): ReactElement {
  return (
    <section className="sc-section">
      <div className="sc-sect-head">
        <h3 className="sc-sect-title">Палітра</h3>
        <span className="sc-sect-note">
          акцент — тільки дія; дані фарбуються своєю серією; нейтральне — сірим
        </span>
      </div>
      <div className="sc-palette">
        {SWATCHES.map((swatch) => (
          <div className="sc-swatch" key={swatch.name}>
            <span className={`sc-swatch-chip ${swatch.className}`} />
            <span className="sc-swatch-name">{swatch.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
