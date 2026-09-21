/**
 * Хрестики-нулики — правила однієї партії проти бота.
 *
 * **Правила — чисті функції, а не стан.** Партія живе в хуку
 * (`useTicTacToe`), а «хто виграв», «куди ходить бот» і «чи вже нічия» —
 * функції від дошки: їх перевіряє `tictactoe.test.ts` без React і без DOM.
 *
 * **Дошка — масив із девʼяти клітинок**, а не матриця: індекси 0…8 лежать в
 * адресі клітинки в розмітці, і перевірка лінії не потребує пари координат.
 *
 * **Бот грає по-справжньому.** Випадковий хід читався б як поламаний, тож
 * порядок один: виграти, завадити виграти, зайняти центр, узяти кут, і аж
 * тоді — будь-яка вільна клітинка. Повного перебору тут немає навмисно:
 * ігри роблять, щоб пограти, а не щоб обіграти людину в нічию.
 *
 * @module web-platform-dev/src/pages/games/tictactoe
 */

/** Знак у клітинці: наш, ботів — або нічий (`null`). */
export type Mark = "x" | "o";
export type Cell = Mark | null;
export type Board = readonly Cell[];

export const BOARD_SIZE = 9;
export const HUMAN: Mark = "x";
export const BOT: Mark = "o";

export const EMPTY_BOARD: Board = Array.from({ length: BOARD_SIZE }, () => null);

/** Вісім ліній, якими закривається партія: три ряди, три стовпці, дві діагоналі. */
const LINES: readonly (readonly number[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function other(mark: Mark): Mark {
  return mark === "x" ? "o" : "x";
}

/** Лінія, зібрана цим знаком — або `null`. Клітинки потрібні, щоб підсвітити. */
export function winningLine(board: Board, mark: Mark): readonly number[] | null {
  return LINES.find((line) => line.every((index) => board[index] === mark)) ?? null;
}

export function winner(board: Board): Mark | null {
  if (winningLine(board, "x")) return "x";
  if (winningLine(board, "o")) return "o";
  return null;
}

/** Порожні клітинки — у порядку номерів. */
export function freeCells(board: Board): number[] {
  return board.flatMap((cell, index) => (cell === null ? [index] : []));
}

export function isDraw(board: Board): boolean {
  return winner(board) === null && freeCells(board).length === 0;
}

/**
 * Хід у клітинку. Занята клітинка або номер поза дошкою нічого не міняють:
 * дошка незмінна, тож перевіряти «а чи можна» окремо не потрібно.
 */
export function place(board: Board, index: number, mark: Mark): Board {
  if (index < 0 || index >= BOARD_SIZE || board[index] !== null) return board;
  const next = [...board];
  next[index] = mark;
  return next;
}

/** Клітинка, якою `mark` закриває партію наступним ходом — або `null`. */
function winningMove(board: Board, mark: Mark): number | null {
  for (const index of freeCells(board)) {
    if (winner(place(board, index, mark)) === mark) return index;
  }
  return null;
}

/** Кути — за годинниковою, від лівого верхнього: перший вільний серед них. */
const CORNERS: readonly number[] = [0, 2, 6, 8];

/**
 * Хід бота. `null` — ходити нікуди (партія вже скінчилась).
 *
 * Порядок важливий і це не евристика «на око»: пропущений власний виграш і
 * пропущений блок — дві помилки, які людина бачить одразу.
 */
export function botMove(board: Board, mark: Mark = BOT): number | null {
  const win = winningMove(board, mark);
  if (win !== null) return win;

  const block = winningMove(board, other(mark));
  if (block !== null) return block;

  if (board[4] === null) return 4;

  const corner = CORNERS.find((index) => board[index] === null);
  if (corner !== undefined) return corner;

  return freeCells(board)[0] ?? null;
}
