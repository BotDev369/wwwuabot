/**
 * `useRps` — стан партії «камінь, ножиці, папір»: рахунок, хід бота й пауза
 * перед показом.
 *
 * **Бот «вибирає», а не відповідає миттєво.** Правило — чиста функція, тож
 * вибір бота відомий у ту саму мить; але показати його одразу означало б
 * прибрати з гри все, крім тексту. Тому між дотиком і результатом стоїть
 * коротка крутилка: знак бота блимає трьома предметами, а рахунок змінюється
 * **після** показу — так раунд не «стається сам».
 *
 * **Крутилка живе в ефекті, а не в стані.** Це єдине місце з таймерами, і
 * ефект прибирає їх за собою: вихід зі сторінки посеред раунду не лишає ні
 * інтервалу, ні пізнього `setState`.
 *
 * @module web-platform-dev/src/pages/games/useRps
 */

import { useEffect, useState } from "react";
import {
  RPS_CHOICES,
  RPS_TARGET,
  outcome,
  randomChoice,
  type RpsChoice,
  type RpsOutcome,
} from "./rps";

/** Скільки триває «вибір» бота — коротко, щоб не чекати, і видно, щоб помітити. */
const ROLL_MS = 650;
/** Як часто крутилка перебирає предмети — близько 10 кадрів на секунду. */
const ROLL_STEP_MS = 80;

export interface RpsRound {
  player: RpsChoice;
  bot: RpsChoice;
  outcome: RpsOutcome;
}

/** Що робить екран: нічого, показує вибір бота — чи вже показує раунд. */
export type RpsPhase = "idle" | "rolling" | "done";

export interface UseRpsResult {
  wins: number;
  losses: number;
  /**
   * Скільки раундів **показано** — не рахунок, а лічильник показів (нічия
   * рахунок не міняє, а показ відбувся).
   *
   * Екранові він потрібен як `key`: клас, що вже стоїть на елементі, анімації
   * не перезапускає — а новий елемент перезапускає. Без нього зіткнення було б
   * видно в першому раунді й більше ніколи.
   */
  plays: number;
  phase: RpsPhase;
  /** Вибір людини показується **одразу** — це її дотик, і чекати йому нема чого. */
  player: RpsChoice | null;
  /** Предмет, що блимає в слоте бота, доки триває крутилка. */
  rolling: RpsChoice | null;
  /** Хід бота — після показу. */
  bot: RpsChoice | null;
  outcome: RpsOutcome | null;
  finished: boolean;
  play: (choice: RpsChoice) => void;
  reset: () => void;
}

export function useRps(random: () => number = Math.random): UseRpsResult {
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [round, setRound] = useState<RpsRound | null>(null);
  // Хід людини, який чекає на показ. Він — і прапорець «крутилка йде».
  const [pending, setPending] = useState<RpsChoice | null>(null);
  const [rolling, setRolling] = useState<RpsChoice | null>(null);
  const [plays, setPlays] = useState(0);

  const finished = wins >= RPS_TARGET || losses >= RPS_TARGET;

  useEffect(() => {
    if (pending === null) return;

    const spinner = setInterval(() => {
      setRolling((prev) => {
        const at = RPS_CHOICES.findIndex((entry) => entry.key === prev);
        return RPS_CHOICES[(at + 1) % RPS_CHOICES.length]?.key ?? "rock";
      });
    }, ROLL_STEP_MS);

    const timer = setTimeout(() => {
      const bot = randomChoice(random);
      const result = outcome(pending, bot);
      // Рахунок міняється тут, а не в `play`: доки раунд не показано, він
      // не відбувся — інакше точки рахунку росли б під крутилкою.
      if (result === "win") setWins((prev) => prev + 1);
      if (result === "lose") setLosses((prev) => prev + 1);
      setRound({ player: pending, bot, outcome: result });
      setPlays((prev) => prev + 1);
      setPending(null);
      setRolling(null);
    }, ROLL_MS);

    return () => {
      clearInterval(spinner);
      clearTimeout(timer);
    };
  }, [pending, random]);

  function play(choice: RpsChoice): void {
    // Другий хід під час крутилки нічого не робить: раунд триває.
    if (finished || pending !== null) return;
    setRound(null);
    setRolling(choice);
    setPending(choice);
  }

  function reset(): void {
    setWins(0);
    setLosses(0);
    setRound(null);
    setPlays(0);
    setPending(null);
    setRolling(null);
  }

  return {
    wins,
    losses,
    plays,
    phase: pending !== null ? "rolling" : round !== null ? "done" : "idle",
    player: pending ?? round?.player ?? null,
    rolling,
    bot: round?.bot ?? null,
    outcome: round?.outcome ?? null,
    finished,
    play,
    reset,
  };
}
