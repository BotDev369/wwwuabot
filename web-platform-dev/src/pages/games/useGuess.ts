/**
 * `useGuess` — стан гри «вгадай число»: загадане, спроби, діапазон.
 *
 * **Загадане живе тут і нікуди не йде.** Це гра на одного, і рахувати її має
 * клієнт: серверний рахунок додав би таблицю, ендпоїнти й питання «а чи не
 * підглянув ти відповідь» — усе заради числа, яке нікому не потрібне поза
 * партією.
 *
 * **Діапазон — похідна від спроб** (`boundsOf`), а не другий стан. Тримати
 * його окремо означало б мати два джерела правди про те саме — і колись
 * показати смугу, яка не збігається з історією.
 *
 * **Невдалий ввід не додає спроби.** «50,5» чи порожнє поле не мають
 * витрачати спробу: правило гри — «число від 1 до 100», і воно вже сказане в
 * підказці, тож карати за промах пальцем нема за що.
 *
 * @module web-platform-dev/src/pages/games/useGuess
 */

import { useState } from "react";
import {
  boundsOf,
  parseGuess,
  randomSecret,
  verdict,
  type GuessAttempt,
  type GuessRange,
} from "./guess";

export interface UseGuessResult {
  attempts: readonly GuessAttempt[];
  /** Остання спроба — те, що показує рядок результату. */
  last: GuessAttempt | null;
  /** Що ще може бути загаданим — саме воно малює смугу. */
  range: GuessRange;
  solved: boolean;
  /**
   * Спроба: `true` — число прийнято (навіть якщо не вгадано), `false` — ввід
   * не був числом у межах. Різницю показує екран.
   */
  submit: (raw: string) => boolean;
  reset: () => void;
}

export function useGuess(random: () => number = Math.random): UseGuessResult {
  // Загадане — стан **ініціалізації**, а не похідна величина: воно мусить
  // лишитись тим самим, доки партія не скінчиться.
  const [secret, setSecret] = useState(() => randomSecret(random));
  const [attempts, setAttempts] = useState<readonly GuessAttempt[]>([]);

  const solved = attempts.some((attempt) => attempt.verdict === "hit");

  function submit(raw: string): boolean {
    if (solved) return false;
    const value = parseGuess(raw);
    if (value === null) return false;
    setAttempts((prev) => [...prev, { value, verdict: verdict(secret, value) }]);
    return true;
  }

  function reset(): void {
    setSecret(randomSecret(random));
    setAttempts([]);
  }

  return {
    attempts,
    last: attempts[attempts.length - 1] ?? null,
    range: boundsOf(attempts),
    solved,
    submit,
    reset,
  };
}
