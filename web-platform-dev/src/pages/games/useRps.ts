/**
 * `useRps` — стан партії «камінь, ножиці, папір»: рахунок і останній раунд.
 *
 * **Партія — до `RPS_TARGET` перемог.** «Один раунд і все» не дає відчуття
 * партії, а «скільки завгодно» — не дає кінця; три перемоги — звичний і
 * короткий рубіж.
 *
 * **Останній раунд показується разом із рахунком.** Після власного вибору
 * людині треба бачити, що вибрав бот, — інакше рахунок росте сам по собі й
 * зрозуміти, чому, нема з чого.
 *
 * @module web-platform-dev/src/pages/games/useRps
 */

import { useState } from "react";
import { RPS_TARGET, outcome, randomChoice, type RpsChoice, type RpsOutcome } from "./rps";

export interface RpsRound {
  player: RpsChoice;
  bot: RpsChoice;
  outcome: RpsOutcome;
}

export interface UseRpsResult {
  wins: number;
  losses: number;
  round: RpsRound | null;
  /** Партія скінчилась: хід більше нічого не міняє, лишається «ще раз». */
  finished: boolean;
  play: (choice: RpsChoice) => void;
  reset: () => void;
}

export function useRps(random: () => number = Math.random): UseRpsResult {
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [round, setRound] = useState<RpsRound | null>(null);

  const finished = wins >= RPS_TARGET || losses >= RPS_TARGET;

  function play(choice: RpsChoice): void {
    if (finished) return;

    const bot = randomChoice(random);
    const result = outcome(choice, bot);
    if (result === "win") setWins((prev) => prev + 1);
    if (result === "lose") setLosses((prev) => prev + 1);
    setRound({ player: choice, bot, outcome: result });
  }

  function reset(): void {
    setWins(0);
    setLosses(0);
    setRound(null);
  }

  return { wins, losses, round, finished, play, reset };
}
