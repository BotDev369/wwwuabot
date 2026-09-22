/**
 * Правила «2048» — те, що ламається мовчки.
 *
 * Невірне складання не кидає помилки: дошка просто стає іншою, ніж мала б.
 * Тому тут перевіряється саме арифметика — скільки зливається, скільки очок,
 * і чи вважається ходом те, що нічого не зрушило.
 *
 * @module web-platform-dev/src/pages/games/twenty48.test
 */

import { describe, expect, it } from "vitest";
import {
  type Board,
  canMove,
  emptyBoard,
  mergeLine,
  slide,
  spawn,
  start,
  tileLevel,
  won,
} from "./twenty48";

/** Дошка з чотирьох рядків — читається як дошка, а не як 16 значень. */
function board(rows: readonly (readonly (number | null)[])[]): Board {
  return rows.flat();
}

/** Детермінований «випадок»: завжди бере першу вільну клітинку й перший бік. */
function firstRandom(): number {
  return 0;
}

describe("складання рядка", () => {
  it("складає сусідні пари й рахує очки", () => {
    expect(mergeLine([2, 2, 4, 4])).toEqual({ cells: [4, 8, null, null], gained: 12 });
  });

  it("кожна плитка бере участь в одному складанні", () => {
    // «2 2 2» — це 4 і 2, а не 8: інакше одна плитка множилась би двічі
    expect(mergeLine([2, 2, 2, null])).toEqual({ cells: [4, 2, null, null], gained: 4 });
  });

  it("зсуває, коли складати нічого", () => {
    expect(mergeLine([null, 4, null, 2])).toEqual({ cells: [4, 2, null, null], gained: 0 });
  });

  it("порожній рядок лишається порожнім", () => {
    expect(mergeLine([null, null, null, null])).toEqual({
      cells: [null, null, null, null],
      gained: 0,
    });
  });

  it("однакова плитка через проміжок не складається", () => {
    expect(mergeLine([4, null, 4, 2])).toEqual({ cells: [8, 2, null, null], gained: 8 });
  });
});

describe("хід", () => {
  const row = board([
    [2, 2, 2, 2],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);

  it("вліво складає до лівого краю", () => {
    const result = slide(row, "left");
    expect(result.board.slice(0, 4)).toEqual([4, 4, null, null]);
    expect(result.gained).toBe(8);
    expect(result.moved).toBe(true);
  });

  it("вправо складає до правого краю", () => {
    expect(slide(row, "right").board.slice(0, 4)).toEqual([null, null, 4, 4]);
  });

  it("вгору читає стовпець згори", () => {
    const column = board([
      [2, null, null, null],
      [2, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const result = slide(column, "up");
    expect(result.board[0]).toBe(4);
    expect(result.board[4]).toBe(null);
  });

  it("вниз читає стовпець знизу", () => {
    const column = board([
      [2, null, null, null],
      [2, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    expect(slide(column, "down").board[12]).toBe(4);
  });

  it("хід, який нічого не зрушив, ходом не вважається", () => {
    // Вільної клітинки немає, сусідів однакових немає — рухати нікуди
    const dead = board([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(slide(dead, "left").moved).toBe(false);
    expect(slide(dead, "up").moved).toBe(false);
  });
});

describe("нова плитка", () => {
  it("стає в порожню клітинку й майже завжди це двійка", () => {
    const after = spawn(emptyBoard(), firstRandom);
    expect(after.filter((value) => value !== null)).toHaveLength(1);
    expect(after[0]).toBe(2);
  });

  it("на повній дошці не з'являється нічого", () => {
    const full = board([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(spawn(full, firstRandom)).toEqual(full);
  });

  it("партія починається з двох плиток — з одною нічого складати", () => {
    const first = start(firstRandom);
    expect(first.filter((value) => value !== null)).toHaveLength(2);
  });
});

describe("кінець партії", () => {
  it("порожня клітинка — ще є ходи", () => {
    expect(canMove(emptyBoard())).toBe(true);
  });

  it("однакові сусіди — ще є ходи", () => {
    const board$ = board([
      [2, 2, 4, 8],
      [4, 8, 16, 32],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(canMove(board$)).toBe(true);
  });

  it("повна дошка без сусідів — ходів немає", () => {
    const dead = board([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(canMove(dead)).toBe(false);
  });

  it("2048 — це віха, а не кінець партії", () => {
    const reached = board([
      [2048, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    expect(won(reached)).toBe(true);
    expect(canMove(reached)).toBe(true);
  });
});

describe("сходинка плитки", () => {
  it("росте разом зі значенням і спиняється на шостій", () => {
    expect(tileLevel(2)).toBe(1);
    expect(tileLevel(4)).toBe(1);
    expect(tileLevel(8)).toBe(2);
    expect(tileLevel(16)).toBe(2);
    expect(tileLevel(64)).toBe(3);
    expect(tileLevel(128)).toBe(4);
    expect(tileLevel(256)).toBe(4);
    expect(tileLevel(512)).toBe(5);
    expect(tileLevel(1024)).toBe(5);
    expect(tileLevel(2048)).toBe(6);
    expect(tileLevel(65536)).toBe(6);
  });
});
