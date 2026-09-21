/**
 * `useGuess` — стан гри «вгадай число»: загадане, спроби, кінець.
 *
 * **Загадане живе тут і нікуди не йде.** Це гра на одного, і рахувати її має
 * клієнт: серверний рахунок додав би таблицю, ендпоїнти й питання «а чи не
 * підглянув ти відповідь» — усе заради числа, яке нікому не потрібне поза
 * партією.
 *
 * **Невдалий ввід не додає спроби.** «50,5» чи порожнє поле не мають
 * витрачати спробу: правило гри — «число від 1 до 100», і воно вже сказане в
 * підказці, тож карати за промах пальцем нема за що.
 *
 * @module web-platform-dev/src/pages/games/useGuess
 */

import { useState } from "react";
import { parseGuess, randomSecret, verdict, type GuessVerdict } from "./guess";

/** Спроба — те, що вже було: число й те, що на нього відповіли. */
export interface GuessAttempt {
  value: number;
  verdict: GuessVerdict;
}

export interface UseGuessResult {
  attempts: readonly GuessAttempt[];
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

  return { attempts, solved, submit, reset };
}
