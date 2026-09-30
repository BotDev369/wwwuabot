/**
 * «Ти не один» — **твій результат поруч із загальним станом.**
 *
 * **Смуга, а не лише число.** Відсоток сам по собі («18%») не каже нічого:
 * не видно, чи це багато, і де в цьому «багато» ти. Тому кожна смуга — це
 * рядок із підписом, лічильником людей і смугою-лінійкою, а **твоя**
 * підсвічена й підписана: це єдиний рядок, який читається першим.
 *
 * **Ніяких кольорів «хорошо / погано».** Смуги фарбуються одним нейтральним
 * кольором, а акцентна — лише та, де стоїть людина. Інакше блок сам собою
 * трактував би 45% смуги як діагноз, чим він не є (те саме правило, що й
 * в `.wb-score-band`).
 *
 * **Блок ніколи не порожній і ніколи не бреше.** Якщо людей немає взагалі —
 * про це сказано прямо; якщо їх мало — це сказано окремою фразою, а сховано
 * нічого.
 *
 * **Один блок на шкалу.** Розподіл рахується по `scaleKey`: 21 бал тривоги й
 * 21 бал настрою — різні речі, і лінійка, що їх змішує, показувала б не
 * «скільки людей має твій стан», а скільки мало схоже число.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentPeers
 */

import { useMemo, type ReactElement } from "react";
import { peerSnapshot, type AssessmentScale, type PeerTally } from "@wwwuabot/shared/assessments";
import { peerReading, peopleCount } from "./peer-view";

interface AssessmentPeersProps {
  scale: AssessmentScale;
  /** Скільки людей у кожній смузі цієї шкали: `bandKey` → людей. */
  tally: PeerTally;
  /** Твій результат — ним позначається твоя смуга. */
  raw: number;
}

export function AssessmentPeers({ scale, tally, raw }: AssessmentPeersProps): ReactElement {
  const snapshot = useMemo(() => peerSnapshot(scale, tally, raw), [scale, tally, raw]);
  const text = useMemo(() => peerReading(snapshot), [snapshot]);

  return (
    <section className="wb-peers">
      <h2 className="wb-section-title">Ти не один</h2>

      <p className="wb-peers-lead">{text.headline}</p>

      <ul className="wb-peers-list">
        {snapshot.bands.map((band) => (
          <li key={band.key} className={`wb-peers-row${band.mine ? " wb-peers-row--mine" : ""}`}>
            <span className="wb-peers-name">{band.label}</span>
            <span className="wb-peers-bar" aria-hidden="true">
              <span className="wb-peers-fill" style={{ width: `${band.percent}%` }} />
            </span>
            <span className="wb-peers-count">
              {band.mine ? "ти · " : ""}
              {peopleCount(band.people)} · {band.percent}%
            </span>
          </li>
        ))}
      </ul>

      {text.place && <p className="wb-peers-place">{text.place}</p>}
      {text.alongside && <p className="wb-peers-alongside">{text.alongside}</p>}
      {text.smallNote && <p className="wb-peers-note">{text.smallNote}</p>}

      <p className="wb-peers-privacy">
        Це усереднені результати всіх, хто проходив тест на платформі: без імен, без відповідей,
        лише кількість людей у кожній групі. Твої результати нікуди не передаються.
      </p>
    </section>
  );
}
