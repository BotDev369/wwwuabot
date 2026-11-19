/**
 * Портрет людини: шапка з тим, наскільки повна картина, дванадцять доменів і
 * розрахунки кожної системи. Подія не маскується під людину — вона каже, що
 * якісного профілю події ще немає.
 *
 * @module packages/ui/src/blocks/date-analysis/Dossier
 */

import { useMemo } from "react";
import { LENSES, claimSources, readDossier, sunInSign } from "@wwwuabot/shared/qualities";
import type { DossierRead } from "./api";
import { DossierCalculations } from "./DossierCalculations";
import { DossierQuality } from "./DossierQuality";

/** Дата людини, а не машинний рядок: `1980-03-03` → `3.03.1980`. */
export function humanDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(day)}.${month}.${year}`;
}

function sourceNames(claims: DossierRead["claims"]): string {
  return claimSources(claims)
    .map((id) => LENSES.find((lens) => lens.id === id)?.name ?? id)
    .join(", ");
}

export function Dossier({ dossier, name }: { dossier: DossierRead; name: string }) {
  const readings = useMemo(() => readDossier(dossier.claims), [dossier.claims]);
  const total = readings.reduce((sum, domain) => sum + domain.qualities.length, 0);
  const known = readings.reduce((sum, domain) => sum + domain.known, 0);
  const modelled = dossier.kind === "person" && dossier.note !== "symbol-missing";

  return (
    <article className="wb-dossier">
      <header className="wb-dossier__head">
        <p className="wb-dossier__kicker">{dossier.kind === "event" ? "Подія" : "Людина"}</p>
        <h3 className="wb-dossier__title">{name}</h3>
        <p className="wb-dossier__meta">
          {humanDate(dossier.date)}
          {dossier.symbol ? ` · Сонце ${sunInSign(dossier.symbol) ?? dossier.symbol}` : ""}
        </p>

        {modelled ? (
          <>
            <p className="wb-dossier__coverage">
              {known} з {total} якостей уже видно
            </p>
            <p className="wb-dossier__note">
              Системи: {sourceNames(dossier.claims)}. Рівень — це те, що каже система, а не оцінка
              людини; якщо система про якість мовчить, вона лишається невідомою.
            </p>
          </>
        ) : (
          <p className="wb-dossier__note">
            {dossier.note === "symbol-missing"
              ? "Для цієї дати системи не дали жодного показника, тож і якостей немає."
              : "Якостей події ми ще не описуємо — і не переносимо на неї риси людини. Лишається символ дня."}
          </p>
        )}
      </header>

      {modelled && <DossierCalculations systems={dossier.systems} />}

      {modelled && (
        <div className="wb-dossier-domains">
          {readings.map((domain) => (
            <section className="wb-dossier-domain" key={domain.domain.id}>
              <h4 className="wb-dossier-domain__title">
                {domain.domain.name}
                <span className="wb-dossier-domain__count">
                  {domain.known} з {domain.qualities.length}
                </span>
              </h4>
              <ul className="wb-dossier-list">
                {domain.qualities.map((reading) => (
                  <DossierQuality key={reading.quality.id} reading={reading} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}
