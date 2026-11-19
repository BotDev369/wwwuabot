/**
 * Виміряні якості окремим блоком: другий вектор ядра поруч із датою.
 *
 * Показуємо тільки виміряне — «Не знаємо» людина вже бачить у досьє за датою.
 * Шар названий уголос: рівень тут виміряний, і з символічним він не змішується.
 * @module packages/ui/src/blocks/date-analysis/DossierMeasured
 */

import { MEASURED_NAME, levelLabel, readDossier } from "@wwwuabot/shared/qualities";
import type { SurveyRead } from "./api";

export function DossierMeasured({ survey }: { survey: SurveyRead }) {
  const readings = readDossier(survey.claims);
  const known = readings.reduce((sum, domain) => sum + domain.known, 0);

  return (
    <article className="wb-measured">
      <header className="wb-measured__head">
        <p className="wb-measured__kicker">Другий шлях · ваші відповіді</p>
        <h3 className="wb-measured__title">Опитування: {MEASURED_NAME}</h3>
        <p className="wb-measured__coverage">{known} з 36 якостей видно з відповідей</p>
        <p className="wb-measured__note">
          Це ваші відповіді, а не дата. Рівень тут виміряний, і він не підвищує впевненості того, що
          каже традиція — ці дві частини не змішуються.
        </p>
      </header>

      <div className="wb-measured-domains">
        {readings
          .filter((domain) => domain.known > 0)
          .map((domain) => (
            <section className="wb-measured-domain" key={domain.domain.id}>
              <h4 className="wb-measured-domain__title">{domain.domain.name}</h4>
              <ul className="wb-measured-list">
                {domain.qualities
                  .filter((reading) => reading.claims.length > 0)
                  .map((reading) => (
                    <li className="wb-measured-quality" key={reading.quality.id}>
                      <span className="wb-measured-quality__name">{reading.quality.name}</span>
                      <span className="wb-measured-quality__level">
                        {reading.level === null ? "Різні відповіді" : levelLabel(reading.level)}
                      </span>
                      <span className="wb-measured-quality__evidence">
                        {reading.claims.map((claim) => claim.evidence).join("; ")}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
      </div>
    </article>
  );
}
