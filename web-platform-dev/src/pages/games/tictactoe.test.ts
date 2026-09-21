/**
 * Правила хрестиків-нуликів — те, що ламається мовчки.
 *
 * Тут три речі, які не видно ні в компіляторі, ні на око: **переможна лінія**
 * (її шукають по восьми, і сьома-восьма — діагоналі, про які забувають),
 * **порядок ходу бота** (спершу виграти, потім завадити — переплутати легко,
 * а помітно це лише коли бот програє вже виграну партію) і **нічия** (повна
 * дошка без переможця — це не помилка, а результат).
 *
 * @module web-platform-dev/src/pages/games/tictactoe.test
 */

import { describe, expect, it } from "vitest";
import {
  BOT,
  EMPTY_BOARD,
  HUMAN,
  botMove,
  freeCells,
  isDraw,
  other,
  place,
  winningLine,
  winner,
  type Board,
} from "./tictactoe";

/** Дошка з рядка: `.` — порожньо, `x` / `o` — знаки. Так партію видно оком. */
function board(rows: readonly string[]): Board {
  return rows.flatMap((row) => [...row].map((cell) => (cell === "." ? null : (cell as "x" | "o"))));
}

describe("переможець", () => {
  it("бачить усі вісім ліній, а не лише ряди", () => {
    const lines: readonly Board[] = [
      board(["xxx", "...", "..."]),
      board(["...", "xxx", "..."]),
      board(["...", "...", "xxx"]),
      board(["x..", "x..", "x.."]),
      board([".x.", ".x.", ".x."]),
      board(["..x", "..x", "..x"]),
      board(["x..", ".x.", "..x"]),
      board(["..x", ".x.", "x.."]),
    ];
    for (const position of lines) {
      expect(winner(position)).toBe("x");
      expect(winningLine(position, "x")).toHaveLength(3);
    }
  });

  it("на порожній дошці нікого немає", () => {
    expect(winner(EMPTY_BOARD)).toBeNull();
    expect(winningLine(EMPTY_BOARD, "x")).toBeNull();
  });

  it("порожні клітинки рахуються як номери, а не як прапорці", () => {
    expect(freeCells(board(["x..", ".o.", "..x"]))).toEqual([1, 2, 3, 5, 6, 7]);
  });

  it("повна дошка без лінії — нічия", () => {
    const draw = board(["xox", "oxo", "oxo"]);
    expect(winner(draw)).toBeNull();
    expect(isDraw(draw)).toBe(true);
  });
});

describe("хід", () => {
  it("у зайняту клітинку не проходить", () => {
    const position = board(["x..", "...", "..."]);
    expect(place(position, 0, "o")).toBe(position);
    expect(place(position, 9, "o")).toBe(position);
  });

  it("дошка не міняється на місці — інакше React не побачив би ходу", () => {
    const before = board([".x.", "...", "..."]);
    const after = place(before, 0, "o");
    expect(before[0]).toBeNull();
    expect(after[0]).toBe("o");
  });

  it("знак міняється на протилежний", () => {
    expect(other(HUMAN)).toBe(BOT);
    expect(other(BOT)).toBe(HUMAN);
  });
});

describe("бот", () => {
  it("закриває партію, коли може — а не заважає людині", () => {
    // У бота два своїх підряд; виграш мусить бути першим рішенням.
    const position = board(["oo.", "xx.", "..."]);
    expect(botMove(position)).toBe(2);
  });

  it("заважає людині виграти", () => {
    const position = board(["xx.", "o..", "..."]);
    expect(botMove(position)).toBe(2);
  });

  it("займає центр, коли вигравати й заважати нема з чого", () => {
    expect(botMove(board(["x..", "...", "..."]))).toBe(4);
  });

  it("зайнятий центр — бере кут, а не будь-яку вільну клітинку", () => {
    // Кут — половина пастки: клітинка в боці дошки не робить нічого.
    expect(botMove(board(["x..", ".o.", "..."]))).toBe(2);
  });

  it("коли своєї перемоги немає — рве лінію людини", () => {
    // Два хрестики в стовпці: якщо бот не стане на 6, наступний хід закриє
    // партію на користь людини. Свій знак бота стоїть збоку навмисно — він
    // не дає ні перемоги, ні лінії, а лише займає клітинку.
    expect(botMove(board(["x..", "x..", "..o"]))).toBe(6);
  });

  it("на повній дошці не ходить зовсім", () => {
    expect(botMove(board(["xox", "oxo", "oxo"]))).toBeNull();
  });
});
