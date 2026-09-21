/**
 * Правила «каменя, ножиць, паперу» — усі девʼять пар.
 *
 * Таблиця переможця — це те, що ламається мовчки: переплутані «ножиці бʼють
 * папір» і «папір бʼє камінь» дають гру, у яку ще можна грати, але рахунок у
 * ній бреше. Тому тут перевіряється кожна пара, а не дві-три «очевидні».
 *
 * @module web-platform-dev/src/pages/games/rps.test
 */

import { describe, expect, it } from "vitest";
import { RPS_CHOICES, RPS_TARGET, choiceLabel, outcome, randomChoice, type RpsChoice } from "./rps";

describe("переможець пари", () => {
  it("камінь бʼє ножиці, ножиці — папір, папір — камінь", () => {
    expect(outcome("rock", "scissors")).toBe("win");
    expect(outcome("scissors", "paper")).toBe("win");
    expect(outcome("paper", "rock")).toBe("win");
  });

  it("і програє у зворотний бік", () => {
    expect(outcome("scissors", "rock")).toBe("lose");
    expect(outcome("paper", "scissors")).toBe("lose");
    expect(outcome("rock", "paper")).toBe("lose");
  });

  it("той самий вибір — нічия", () => {
    for (const { key } of RPS_CHOICES) expect(outcome(key, key)).toBe("draw");
  });

  it("перевірені всі девʼять пар, і жодна не лишилась без відповіді", () => {
    const keys = RPS_CHOICES.map((choice) => choice.key);
    for (const player of keys) {
      for (const bot of keys) {
        expect(["win", "lose", "draw"], `${player} проти ${bot}`).toContain(outcome(player, bot));
      }
    }
    expect(keys.length ** 2).toBe(9);
  });
});

describe("вибір бота", () => {
  it("рівно один із трьох — і з передбачуваним джерелом випадку", () => {
    // 0, 0.5 і 0.99 — це початок, середина й кінець діапазону: саме тут видно,
    // чи не вилітає вибір за межі списку.
    expect(randomChoice(() => 0)).toBe(RPS_CHOICES[0]?.key);
    expect(randomChoice(() => 0.5)).toBe(RPS_CHOICES[1]?.key);
    expect(randomChoice(() => 0.99)).toBe(RPS_CHOICES[2]?.key);
  });

  it("межа `1` не дає `undefined`", () => {
    const choice: RpsChoice = randomChoice(() => 1);
    expect(RPS_CHOICES.map((entry) => entry.key)).toContain(choice);
  });
});

describe("підписи", () => {
  it("кожен вибір має назву, і назви не повторюються", () => {
    const labels = RPS_CHOICES.map((choice) => choice.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const { key } of RPS_CHOICES) expect(choiceLabel(key)).toBeTruthy();
  });

  it("партія триває до трьох перемог", () => {
    expect(RPS_TARGET).toBeGreaterThan(1);
  });
});
