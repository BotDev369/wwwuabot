/**
 * Результат **однієї шкали**: бал, смуга, розкид по сферах, «що це означає»,
 * «Ти не один» і персональні акценти.
 *
 * **Один блок на шкалу, а не один на тест.** «Тревожність і депресія» має дві
 * шкали, тож два блоки з окремими балами, окремими смугами й окремим
 * розподілом між людьми. Змішати їх у один бал можна було б, але тоді
 * «12 з 27» і «3 з 21» стояли б поруч без назв — і людина не знала б, що
 * саме їй порадили дивитись.
 *
 * **Порядок блоків — це і є трактування.** Спершу бал, потім розкид по сферах
 * («сон — 2 з 3»), бо саме він відповідає на питання «що зі мною», з яким
 * людина прийшла. Бал без нього — це про інструмент, а не про людину.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentScaleResult
 */

import { type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  alertCount as countAlerts,
  exceedsAttention,
  isCoreMoodAlarmed,
  itemAlerts,
  maxRawScore,
  type AssessmentRecord,
  type AssessmentScale,
  type AssessmentTest,
  type PeerTally,
} from "@wwwuabot/shared/assessments";
import { profileReading, thresholdLine } from "./assessment-view";
import { AssessmentAlerts } from "./AssessmentAlerts";
import { AssessmentPeers } from "./AssessmentPeers";
import { ProseText } from "./ProseText";

interface AssessmentScaleResultProps {
  test: AssessmentTest;
  scale: AssessmentScale;
  record: AssessmentRecord;
  /** Скільки людей у кожній смузі цієї шкали — без імен. */
  tally: PeerTally;
  /** Вплив на життя — спільне питання, тому рахується один раз на тест. */
  impact: string | null;
}

export function AssessmentScaleResult({
  test,
  scale,
  record,
  tally,
  impact,
}: AssessmentScaleResultProps): ReactElement {
  const profile = profileReading(test, scale, record);
  const band = scale.bands.find((candidate) => candidate.key === record.bandKey);
  // Прапорці рахуються з тих самих відповідей, що лежать у рядку: вони не
  // зберігаються окремо, тож старий результат отримує ту саму поведінку.
  const alerts = itemAlerts(test, scale, record.answers);
  const coreMood = isCoreMoodAlarmed(test, scale, record.answers);

  return (
    <section className="wb-scale-result">
      <h2 className="wb-scale-result-title">{scale.title}</h2>

      <div className="wb-score">
        <span className="wb-score-value">{record.raw}</span>
        <span className="wb-score-band">з {maxRawScore(test, scale)}</span>
      </div>

      {band && <p className="wb-score-note">{band.label}</p>}

      <div className="wb-profile">
        <p className="wb-profile-line">{profile.strongest}</p>
        {profile.weakest !== profile.strongest && (
          <p className="wb-profile-line wb-profile-line--weak">{profile.weakest}</p>
        )}
        {profile.question && <p className="wb-profile-question">{profile.question}</p>}
        <p className="wb-scale-reading">{thresholdLine(test, scale, record)}</p>
      </div>

      {band && (
        <div className="wb-level">
          <h3 className="wb-section-title">Що це означає</h3>
          <ProseText text={band.note} />
        </div>
      )}

      {/* **Порівняння — після «Що це означає», а не перед ним.** Спершу
          людині кажуть, що означає її бал, і лише потім — що такі бали є в
          інших. Навпаки вийде «ти гірший за більшість», і це прочитання
          з'явиться раніше за розуміння, що взагалі такий бал має сенс. */}
      <AssessmentPeers scale={scale} tally={tally} raw={record.raw} />

      <AssessmentAlerts
        alerts={alerts}
        impact={impact}
        coreMood={coreMood}
        alertCount={countAlerts(test, scale, record.answers)}
      />

      {exceedsAttention(scale, record.raw) && (
        <p className="wb-scale-result-flag">
          <Icon name="warning" size={14} /> варто поговорити з фахівцем
        </p>
      )}
    </section>
  );
}
