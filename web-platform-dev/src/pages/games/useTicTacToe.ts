/**
 * `useTicTacToe` — стан партії хрестиків-нуликів: дошка, результат, рахунок.
 *
 * **Бот відповідає в тому ж кроці.** Хід бота з паузою читався б як «гра
 * думає», а тут думати нічому: правило — чиста функція. Заодно немає ефекту з
 * таймером, який довелось би чистити при виході зі сторінки.
 *
 * **Рахунок рахує хід, а не рендер.** Партія закривається один раз — у тому
 * ж переході, де з'явився результат; інакше рахунок залежав би від того,
 * скільки разів React перемалював екран.
 *
 * @module web-platform-dev/src/pages/games/useTicTacToe
 */

import { useState } from "react";
import {
  BOT,
  EMPTY_BOARD,
  HUMAN,
  botMove,
  freeCells,
  place,
  winningLine,
  winner,
  type Board,
} from "./tictactoe";

/** Чим скінчилась партія: `null` — ще грають. */
export type TicTacToeResult = "won" | "lost" | "draw";

export interface TicTacToeScore {
  won: number;
  lost: number;
  draw: number;
}

export interface UseTicTacToeResult {
  board: Board;
  result: TicTacToeResult | null;
  /** Клітинки переможної лінії — щоб підсвітити. */
  line: readonly number[] | null;
  score: TicTacToeScore;
  /** Хід людини: зайнята клітинка й закрита партія нічого не роблять. */
  play: (index: number) => void;
  reset: () => void;
}

const EMPTY_SCORE: TicTacToeScore = { won: 0, lost: 0, draw: 0 };

export function useTicTacToe(): UseTicTacToeResult {
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [result, setResult] = useState<TicTacToeResult | null>(null);
  const [score, setScore] = useState<TicTacToeScore>(EMPTY_SCORE);

  function finish(kind: TicTacToeResult, next: Board): void {
    setBoard(next);
    setResult(kind);
    setScore((prev) => ({
      won: prev.won + (kind === "won" ? 1 : 0),
      lost: prev.lost + (kind === "lost" ? 1 : 0),
      draw: prev.draw + (kind === "draw" ? 1 : 0),
    }));
  }

  function play(index: number): void {
    if (result !== null || board[index] !== null) return;

    const afterHuman = place(board, index, HUMAN);
    if (winner(afterHuman) === HUMAN) {
      finish("won", afterHuman);
      return;
    }
    if (freeCells(afterHuman).length === 0) {
      finish("draw", afterHuman);
      return;
    }

    const reply = botMove(afterHuman);
    const afterBot = reply === null ? afterHuman : place(afterHuman, reply, BOT);
    if (winner(afterBot) === BOT) {
      finish("lost", afterBot);
      return;
    }
    if (freeCells(afterBot).length === 0) {
      finish("draw", afterBot);
      return;
    }

    setBoard(afterBot);
  }

  function reset(): void {
    setBoard(EMPTY_BOARD);
    setResult(null);
  }

  // Переможну лінію показуємо й тоді, коли виграв бот: людина мусить бачити,
  // **де** її закрили, а не лише те, що партія скінчилась.
  const line = result === "draw" ? null : winningLine(board, result === "won" ? HUMAN : BOT);

  return { board, result, line, score, play, reset };
}
