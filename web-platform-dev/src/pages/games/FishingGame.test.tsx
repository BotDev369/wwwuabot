/**
 * Екран «Веселої рибалки» — те, що ламається мовчки.
 *
 * Партію ведуть правила, і вони перевірені окремо. Тут перевіряється **зв'язок**
 * правил з екраном: смуги, по яких ходять дотиком, життя, які видно, і центр
 * поля, у якому вовк стоїть на старті. Забута смуга не ламає ні збірку, ні
 * тести — гра просто стає непроходимою, і помітити це можна лише пальцем.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React: ефектів тут немає, а отже перед нами **стартовий** стан партії.
 *
 * @module web-platform-dev/src/pages/games/FishingGame.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FishingGame } from "./FishingGame";
import { LANES, lanePercent } from "./fishing-pond";

const HTML = renderToStaticMarkup(<FishingGame />);

/** Усі кнопки смуг — у порядку, як вони стоять на екрані. */
function lanes(markup: string): string[] {
  return [...markup.matchAll(/aria-label="(Смуга \d)"/g)].map((match) => match[1] ?? "");
}

describe("екран рибалки", () => {
  it("малює ополонку, а не порожню форму", () => {
    expect(HTML).toContain("wb-fishing");
    expect(HTML).toContain("wb-fishing-air");
    expect(HTML).toContain("wb-fishing-wolf");
    expect(HTML).toContain("wb-fishing-bucket");
  });

  it("у кожної смуги є адреса: дотик має куди вести", () => {
    expect(lanes(HTML)).toHaveLength(LANES);
    expect(new Set(lanes(HTML)).size).toBe(LANES);
  });

  it("вовк стоїть посередині — за такою ж геометрією, як і смуги", () => {
    // Стартова позиція — з правил: екран не має власного числа для центру
    expect(HTML).toContain(`left:${lanePercent(Math.floor(LANES / 2))}%`);
  });

  it("життя видно слотами й кожен слот має ім'я", () => {
    const slots = [...HTML.matchAll(/aria-label="(життя|життя втрачено)"/g)];

    expect(slots).toHaveLength(3);
    expect(slots.every((slot) => slot[1] === "життя")).toBe(true);
  });

  it("пульт і «спочатку» на місці: без них партія не починається", () => {
    expect(HTML).toContain('"Лівіше"');
    expect(HTML).toContain('"Правіше"');
    expect(HTML).toContain("Спочатку");
  });

  it("⛔ кольору в розмітці немає — палітра приходить із `games.css`", () => {
    // Виняток із токенів дозволений лише як блок у спільному CSS: щойно колір
    // з'явиться тут, «прибрати виняток» означатиме шукати його по коду
    expect(HTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(HTML).not.toMatch(/rgba?\(/i);
  });
});
