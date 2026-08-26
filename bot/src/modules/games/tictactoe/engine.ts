export type Cell = "X" | "O" | null;
export type TttStatus = "playing" | "win" | "lose" | "draw";
export interface TttScore {
  w: number;
  l: number;
  d: number;
}
export interface TttState {
  board: Cell[]; // 9 клітинок, гравець = X
  turn: "X" | "O";
  status: TttStatus;
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function newGame(): TttState {
  return { board: Array(9).fill(null), turn: "X", status: "playing" };
}

export function winnerOf(b: Cell[]): "X" | "O" | "draw" | null {
  for (const [a, x, c] of LINES) {
    if (b[a] && b[a] === b[x] && b[a] === b[c]) return b[a] as "X" | "O";
  }
  if (b.every((v) => v)) return "draw";
  return null;
}

// Хід гравця; якщо ок — одразу хід бота. Повертає false, якщо хід невалідний.
export function playerMove(s: TttState, idx: number): boolean {
  if (s.status !== "playing" || s.turn !== "X" || s.board[idx]) return false;
  s.board[idx] = "X";
  finish(s);
  if (s.status === "playing") {
    s.turn = "O";
    botMove(s);
  }
  return true;
}

function botMove(s: TttState): void {
  const idx = chooseBot(s.board);
  s.board[idx] = "O";
  finish(s);
  if (s.status === "playing") s.turn = "X";
}

function finish(s: TttState): void {
  const w = winnerOf(s.board);
  if (w === "X") s.status = "win";
  else if (w === "O") s.status = "lose";
  else if (w === "draw") s.status = "draw";
}

// "Розумний середняк": виграти → блокувати → центр → кути → будь-де.
function chooseBot(b: Cell[]): number {
  const win = findLine(b, "O");
  if (win >= 0) return win;
  const blk = findLine(b, "X");
  if (blk >= 0) return blk;
  if (!b[4]) return 4;
  const corners = [0, 2, 6, 8].filter((i) => !b[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  const empty = b.map((v, i) => (v ? null : i)).filter((v): v is number => v !== null);
  return empty[0];
}

function findLine(b: Cell[], who: "X" | "O"): number {
  for (const [a, x, c] of LINES) {
    const vals = [b[a], b[x], b[c]];
    if (vals.filter((v) => v === who).length === 2 && vals.some((v) => v === null)) {
      return [a, x, c][vals.indexOf(null)];
    }
  }
  return -1;
}
