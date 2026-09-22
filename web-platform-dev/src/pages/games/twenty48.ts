/**
 * Правила «2048» — чисті функції над дошкою.
 *
 * **Дошка — плаский масив, а не матриця.** 16 клітинок одним рядом: у матриці
 * кожен хід вимагав би `map` по рядках і `transpose`, і та сама логіка
 * існувала б у чотирьох варіантах (уліво / вправо / вгору / вниз). Тут хід —
 * це **лінії**: у кожного напрямку беруться ті самі чотири лінії, лише
 * прочитані з потрібного краю, і до них застосовується одна операція.
 *
 * **Складання — окрема функція.** `mergeLine` не знає ні про дошку, ні про
 * напрямок: вона складає один рядок. Це і є все правило гри, тож його
 * перевіряють тести без дошок, ходів і випадковості.
 *
 * **Плитка не народжується в правилі.** `slide` тільки рухає; нову плитку
 * додає той, хто робить хід (`spawn`), і теж окремо — інакше «хід у стіну»
 * народжував би плитку за ніщо.
 *
 * @module web-platform-dev/src/pages/games/twenty48
 */

/** Сторона дошки: 4×4 — класика, і на телефоні клітинка лишається пальцю. */
export const SIZE = 4;

/** Плитка, з якої партія вважається виграною. */
export const TARGET = 2048;

export type Direction = "up" | "down" | "left" | "right";

/** Порожня клітинка — `null`, а не `0`: у плитки немає значення «нуль». */
export type Board = readonly (number | null)[];

/** Напрямки в порядку, у якому їх показує пульт: хрестовина. */
export const DIRECTIONS: readonly Direction[] = ["up", "left", "down", "right"];

/** Порожня дошка — з неї починає `start`. */
export function emptyBoard(): Board {
  return Array.from({ length: SIZE * SIZE }, () => null);
}

/**
 * Клітинки однієї лінії — **у порядку читання від того краю, куди їдемо**.
 *
 * `index` — номер лінії (рядка для горизонталі, стовпця для вертикалі).
 * Порядок тут і є напрямком: склавши лінію завжди «в початок», ми отримуємо
 * один хід замість чотирьох різних.
 */
function lineIndexes(direction: Direction, index: number): number[] {
  const cells: number[] = [];
  for (let step = 0; step < SIZE; step++) {
    if (direction === "left") cells.push(index * SIZE + step);
    else if (direction === "right") cells.push(index * SIZE + (SIZE - 1 - step));
    else if (direction === "up") cells.push(step * SIZE + index);
    else cells.push((SIZE - 1 - step) * SIZE + index);
  }
  return cells;
}

/**
 * Скласти один рядок у бік початку: `2 2 4 4` → `4 8` і 12 очок.
 *
 * **Пара — сусідня і лише раз.** `2 2 2` дає `4 2`, а не `8`: кожна плитка
 * бере участь в одному складанні за хід — саме тому тут `i++` усередині
 * гілки, а не окремий прохід.
 */
export function mergeLine(cells: readonly (number | null)[]): {
  cells: (number | null)[];
  gained: number;
} {
  const tiles = cells.filter((value): value is number => value !== null);
  const out: (number | null)[] = [];
  let gained = 0;

  for (let i = 0; i < tiles.length; i++) {
    const value = tiles[i] ?? 0;
    if (tiles[i + 1] === value) {
      const sum = value * 2;
      out.push(sum);
      gained += sum;
      i++; // обидві плитки стали однією — другу вже ні з чим складати
    } else {
      out.push(value);
    }
  }

  while (out.length < SIZE) out.push(null);
  return { cells: out, gained };
}

/**
 * Хід: що стане з дошкою, скільки очок він принесе і чи щось узагалі змінилось.
 *
 * `moved` — не прикраса: без нього хід у стіну вважався б ходом, і партія
 * народжувала б плитку за натискання стрілки в порожнечу.
 */
export function slide(
  board: Board,
  direction: Direction,
): { board: Board; gained: number; moved: boolean } {
  const next = [...board];
  let gained = 0;
  let moved = false;

  for (let index = 0; index < SIZE; index++) {
    const order = lineIndexes(direction, index);
    const before = order.map((at) => board[at] ?? null);
    const merged = mergeLine(before);
    gained += merged.gained;

    order.forEach((at, step) => {
      const value = merged.cells[step] ?? null;
      if (before[step] !== value) moved = true;
      next[at] = value;
    });
  }

  return { board: next, gained, moved };
}

/** Порожні клітинки — те, куди може стати нова плитка. */
export function empties(board: Board): number[] {
  const out: number[] = [];
  board.forEach((value, at) => {
    if (value === null) out.push(at);
  });
  return out;
}

/**
 * Нова плитка: 2 або 4, і майже завжди 2.
 *
 * Дві двійки на початку — це те, що робить партію партією: перший хід має що
 * складати, інакше перший дотик нічого не показує.
 */
export function spawn(board: Board, random: () => number = Math.random): Board {
  const free = empties(board);
  if (!free.length) return board;
  const at = free[Math.min(free.length - 1, Math.floor(random() * free.length))];
  if (at === undefined) return board;
  const next = [...board];
  next[at] = random() < 0.9 ? 2 : 4;
  return next;
}

/** Початкова дошка: дві плитки, а не одна — з нею вже є що складати. */
export function start(random: () => number = Math.random): Board {
  return spawn(spawn(emptyBoard(), random), random);
}

/**
 * Чи лишились ходи.
 *
 * Дошка мертва, коли немає ні порожньої клітинки, ні двох однакових сусідів —
 * тому перевіряються саме сусіди (вниз і вправо), а не всі пари.
 */
export function canMove(board: Board): boolean {
  if (empties(board).length > 0) return true;

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const value = board[row * SIZE + col];
      if (col + 1 < SIZE && board[row * SIZE + col + 1] === value) return true;
      if (row + 1 < SIZE && board[(row + 1) * SIZE + col] === value) return true;
    }
  }
  return false;
}

/** Чи досягнуто 2048. Партія після цього не закінчується — це лише віха. */
export function won(board: Board): boolean {
  return board.some((value) => value !== null && value >= TARGET);
}

/**
 * Сходинка плитки для оформлення: 2–4 → 1, 8–16 → 2, 32–64 → 3, 128–256 → 4,
 * 512–1024 → 5, 2048 і вище → 6.
 *
 * Кольорів шість, а значень — багато: розкладати їх по одному означало б
 * десятки правил у CSS і стільки ж відтінків, яких око вже не розрізняє.
 * Кожна сходинка вдвічі ширша за попередню — саме тому крок не лінійний.
 */
export function tileLevel(value: number): number {
  let level = 1;
  // `probe` — верхня межа сходинки: 4, 16, 64, 256, 1024
  let probe = 4;
  while (value > probe && level < 6) {
    level++;
    probe *= 4;
  }
  return level;
}
