/**
 * `use2048` — стан партії «2048»: дошка, очки, кінець.
 *
 * **Хід у стіну не є ходом.** `slide` каже, чи щось зрушило (`moved`), і лише
 * тоді народжується нова плитка: інакше натискання стрілки в порожнечу
 * наповнювало б дошку за нічого.
 *
 * **Позначки зміни рахуються тут, а не на екрані.** «Яка плитка щойно
 * з'явилась або склалась» — це різниця між дошкою до ходу й після; рахувати її
 * на екрані означало б тримати там копію попередньої дошки. Екран дістає
 * готовий список індексів і тільки додає клас руху (`changed`).
 *
 * @module web-platform-dev/src/pages/games/use2048
 */

import { useCallback, useState } from "react";
import { type Board, type Direction, canMove, slide, spawn, start, won } from "./twenty48";

export interface Use2048Result {
  board: Board;
  score: number;
  /** Індекси плиток, які щойно з'явились або склались — для руху. */
  changed: readonly number[];
  /** Ходів більше немає: дошка повна й сусідів для складання немає. */
  over: boolean;
  /** 2048 зібрано. Партія на цьому не кінчається — можна грати далі. */
  reached: boolean;
  move: (direction: Direction) => void;
  reset: () => void;
}

export function use2048(random: () => number = Math.random): Use2048Result {
  const [board, setBoard] = useState<Board>(() => start(random));
  const [score, setScore] = useState(0);
  const [changed, setChanged] = useState<readonly number[]>([]);

  const over = !canMove(board);

  const move = useCallback(
    (direction: Direction): void => {
      if (over) return;
      const result = slide(board, direction);
      if (!result.moved) return;

      const after = spawn(result.board, random);
      const marks: number[] = [];
      after.forEach((value, at) => {
        // Плитка «змінилась», якщо на цьому місці було інше — порожньо або менше
        if (value !== null && value !== board[at]) marks.push(at);
      });

      setBoard(after);
      setChanged(marks);
      setScore((prev) => prev + result.gained);
    },
    // `board` у залежностях — і це правильно: хід читає дошку, а не історію
    [board, over, random],
  );

  const reset = useCallback((): void => {
    setBoard(start(random));
    setScore(0);
    setChanged([]);
  }, [random]);

  return { board, score, changed, over, reached: won(board), move, reset };
}
