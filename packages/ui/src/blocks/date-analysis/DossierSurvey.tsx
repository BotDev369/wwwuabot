/**
 * Другий вектор на тому ж екрані: опитування.
 *
 * Це вибір, а не автоматика: відповіді описують людину, а не дату, тож
 * додаються лише після галочки (`survey: true`). «Ще не виміряно» — стан, а не
 * помилка: блок каже це прямо й веде до тестів, а не показує середину.
 * @module packages/ui/src/blocks/date-analysis/DossierSurvey
 */

import { Icon } from "@wwwuabot/shared";
import { ASSESSMENTS_PATH } from "@wwwuabot/shared/app/routes";

interface DossierSurveyProps {
  readonly enabled: boolean;
  /**
   * `null` — запит ще не відповів; `false` — виміру немає; `true` — додано.
   * Стан «не знаємо» не показується як «немає»: це різні речі.
   */
  readonly measured: boolean | null;
  readonly onChange: (next: boolean) => void;
}

function statusOf(enabled: boolean, measured: boolean | null): string {
  if (!enabled) return "не додано";
  if (measured === null) return "перевіряємо";
  return measured ? "додано" : "ще не виміряно";
}

export function DossierSurvey({ enabled, measured, onChange }: DossierSurveyProps) {
  return (
    <aside className="wb-dossier-survey">
      <div className="wb-dossier-survey__head">
        <span className="wb-dossier-survey__title">Опитування</span>
        <span className="wb-dossier-survey__status">{statusOf(enabled, measured)}</span>
      </div>
      <p className="wb-dossier-survey__text">
        Дата описує символічний шар. Другий вектор — ваші відповіді на питання: він додає виміряний
        шар окремо, не змішується з датою й не підвищує її впевненості.
      </p>

      <label className="wb-dossier-survey__toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        Додати мої виміряні якості
      </label>

      {enabled && measured === false && (
        <p className="wb-dossier-survey__hint">
          Проходження ще немає — досьє лишається тільки з дати. Пройдіть «Велику п'ятірку», і якості
          з'являться тут окремим шаром.
        </p>
      )}

      <a className="wb-dossier-survey__link" href={ASSESSMENTS_PATH}>
        Пройти тести
        <Icon name="arrow-right" size={16} />
      </a>
    </aside>
  );
}
