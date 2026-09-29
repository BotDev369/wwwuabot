/**
 * Розподіл результатів між усіма, хто проходив той самий тест.
 *
 * **Це рахунок, а не аналітика.** Агрегат містить лише кількість людей у
 * кожній смузі: жодного `owner_id`, жодної дати, жодної відповіді. Дивитися
 * на нього безпечно — ідентифікувати в ньому нікого, і сам він не дозволяє
 * дізнатися ні про кого конкретного.
 *
 * **Одна людина — один голос, а не один рядок.** Рахується **останній**
 * результат кожної людини (`MAX(id)` у групі `owner_id + test_key`): хто
 * проходив тест п'ять разів, важить стільки ж, скільки той, хто проходив
 * один. Інакше найактивніші витісняли б із розподілу всіх інших, і блок
 * показував би не людей, а кількість тестів.
 *
 * **Напрямок шкали береться з тесту.** Для PHQ-9 і GAD-7 більше — гірше,
 * для WHO-5 навпаки, тому «ближчі до одужання» рахується напрямком шкали, а
 * не порівнянням сум. Смуги повертаються від найкращої до найгіршої, тож
 * рахунок тих, хто ближче, — це просто смуги, що стоять вище за твою.
 *
 * @module @wwwuabot/shared/assessments/peer
 */

import { bandOf } from "./score";
import type { AssessmentTest } from "./types";

/** Скільки людей у кожній смузі: `bandKey` → людей. Без нічого ідентифікуючого. */
export type PeerTally = Readonly<Record<string, number>>;

/** Рахунки за тестами: `testKey` → такий рахунок. */
export type PeerTallies = Readonly<Record<string, PeerTally>>;

/**
 * **Нижче цього числа рахунок не вистачає для висновку.** Не щоб сховати
 * дані, а щоб не брехати: за трьома відповідями «більшість людей» — це
 * твердження про шістьох, яких тут немає. Сами дані показуються завжди, з
 * точним `N`; різниця — у попередженні, а не в порожньому екрані.
 */
export const PEER_SMALL_SAMPLE = 5;

/** Одна смуга в розподілі: скільки людей, який це відсоток, чи це твоя смуга. */
export interface PeerBandShare {
  readonly key: string;
  readonly label: string;
  readonly people: number;
  /** Відсоток від `total`, округлений. */
  readonly percent: number;
  readonly mine: boolean;
}

/** Розподіл одного тесту: смуги, твоє місце в них і що навколо тебе. */
export interface PeerSnapshot {
  /** Скільки людей загалом увійшло в рахунок (включно з тобою). */
  readonly total: number;
  /** Смуги від найкращої до найгіршої. */
  readonly bands: readonly PeerBandShare[];
  /** Твоя смуга — `null`, якщо результат не потрапив у жодну (дані розходжуються). */
  readonly mine: PeerBandShare | null;
  /**
   * Людей, чий результат **ближчий до одужання**, ніж твій.
   *
   * Величина, а не оцінка: вона рахує рівні, а не людей. «Кращих за тебе —
   * дев'ять» вишиковувало б дев'ятьох людей над людиною, яка читає, а це
   * рівно та оцінка стану, від якої блок відсторонюється.
   */
  readonly milderPeople: number;
  /** Вибірка замала, щоб робити з неї висновок. */
  readonly small: boolean;
}

/**
 * Смуги від найкращої до найгіршої.
 *
 * Порядок у тесті — це порядок смуг, а не «від доброго до поганого»: у
 * PHQ-9 перша смуга найкраща, а в WHO-5 перша — найгірша, бо там більше
 * бала означає більше благополуччя. Тому напрямок береться з
 * `severityDirection`, а не з позиції в масиві.
 */
function bestFirst(test: AssessmentTest): typeof test.bands {
  const higherIsWorse = test.severityDirection === "higher-is-worse";
  return [...test.bands].sort((a, b) => (higherIsWorse ? a.min - b.min : b.min - a.min));
}

/** Люди в смузі: не число, не рядок і не відсутність — нуль. */
function peopleIn(tally: PeerTally, key: string): number {
  const value = tally[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Розподіл для одного тесту.
 *
 * `tally` приходить із сервера, `raw` — твій результат. `raw` потрібен не
 * для суми, а щоб позначити смугу: без нього блок показує розподіл, але не
 * показує, де в ньому ти.
 */
export function peerSnapshot(test: AssessmentTest, tally: PeerTally, raw: number): PeerSnapshot {
  const ordered = bestFirst(test);
  const mineKey = bandOf(test, raw)?.key ?? null;

  // Рахуємо в два проходи: відсоток не знаєш, доки не порахував знаменник.
  const people = ordered.map((band) => peopleIn(tally, band.key));
  const total = people.reduce((sum, count) => sum + count, 0);
  const mineIndex = ordered.findIndex((band) => band.key === mineKey);

  const bands: PeerBandShare[] = ordered.map((band, index) => ({
    key: band.key,
    label: band.label,
    people: people[index] ?? 0,
    percent: total === 0 ? 0 : Math.round(((people[index] ?? 0) / total) * 100),
    mine: band.key === mineKey,
  }));

  // Усе, що **вище** твоєї смуги, — це результати ближчі до одужання. Вони
  // рахуються з тих самих чисел, що й смуги, тож разом із твоєю смугою
  // дають рівно `total` без залишку, а відсотки не «розповзаються» на 101%.
  // Людина рахує себе сама — тому «серед усіх» означає `total`, а не
  // `total - 1`: інакше два ряди блоку не додалися б до тих самих 100%.
  const milderPeople =
    mineIndex === -1 ? 0 : people.slice(0, mineIndex).reduce((sum, count) => sum + count, 0);

  return {
    total,
    bands,
    mine: mineIndex === -1 ? null : (bands[mineIndex] ?? null),
    milderPeople,
    small: total < PEER_SMALL_SAMPLE,
  };
}
