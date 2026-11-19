/**
 * Другий вектор аналізу на тому ж екрані: опитування. Воно не пораховане, і
 * це сказано прямо — з переходом до наявних тестів, а не з вигаданим балом.
 *
 * @module packages/ui/src/blocks/date-analysis/DossierSurvey
 */

import { Icon } from "@wwwuabot/shared";
import { ASSESSMENTS_PATH } from "@wwwuabot/shared/app/routes";

export function DossierSurvey() {
  return (
    <aside className="wb-dossier-survey">
      <div className="wb-dossier-survey__head">
        <span className="wb-dossier-survey__title">Опитування</span>
        <span className="wb-dossier-survey__status">ще не виміряно</span>
      </div>
      <p className="wb-dossier-survey__text">
        Дата описує символічний шар. Другий вектор — ваші відповіді на питання: він додає виміряний
        шар, який не змішується з датою й не підвищує її впевненості.
      </p>
      <a className="wb-dossier-survey__link" href={ASSESSMENTS_PATH}>
        Пройти тести
        <Icon name="arrow-right" size={16} />
      </a>
    </aside>
  );
}
