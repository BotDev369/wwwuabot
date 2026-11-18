/**
 * Палітра: п’ять класів кольору, які є в продукті.
 *
 * Акцент — дія, `data-*` — серії даних, `data-0` — нейтральне, статуси —
 * зміст. Сірого тут два: `--text-muted` і `--data-0`.
 *
 * @module web-admin-dev/src/pages/style/PaletteSection
 */

import type { ReactElement } from "react";
import demo from "./demo.json";

export function PaletteSection(): ReactElement {
  return (
    <section className="sc-section">
      <div className="sc-sect-head">
        <h3 className="sc-sect-title">{demo.palette.title}</h3>
        <span className="sc-sect-note">{demo.palette.note}</span>
      </div>
      <div className="sc-palette">
        {demo.palette.swatches.map((swatch) => (
          <div className="sc-swatch" key={swatch.name}>
            <span className={`sc-swatch-chip ${swatch.className}`} />
            <span className="sc-swatch-name">{swatch.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
