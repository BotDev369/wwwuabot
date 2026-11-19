/**
 * Досьє суб'єкта: шапка з покриттям і дванадцять доменів. Подія не маскується
 * під людину — вона каже, що якісного профілю події в ядрі ще немає.
 *
 * @module packages/ui/src/blocks/date-analysis/Dossier
 */

import { useMemo } from "react";
import { LENSES, claimSources, readDossier } from "@wwwuabot/shared/qualities";
import type { DossierRead } from "./api";
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
          {dossier.symbol ? ` · Сонце в ${dossier.symbol}` : ""}
        </p>

        {modelled ? (
          <>
            <p className="wb-dossier__coverage">
              {known} з {total} якостей мають свідчення
            </p>
            <p className="wb-dossier__note">
              Джерело: {sourceNames(dossier.claims)}. Рівень — це свідчення джерела, а не оцінка
              людини; без свідчень якість лишається невідомою.
            </p>
          </>
        ) : (
          <p className="wb-dossier__note">
            {dossier.note === "symbol-missing"
              ? "Калькулятор не дав символічного знака для цієї дати, тож свідчень немає."
              : "Якісного профілю події ядро ще не описує, і риси людини до події не переносяться. Лишається лише символ дня."}
          </p>
        )}
      </header>

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
