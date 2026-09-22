/**
 * Екран «Ну, погоди!» — те, що ламається мовчки.
 *
 * Партію ведуть правила, і вони перевірені окремо. Тут перевіряється **звʼязок**
 * правил з екраном: курки на своїх доріжках, доріжки, по яких ходять дотиком,
 * життя, які видно, і центр поля, у якому вовк стоїть на старті. Забута курка
 * не ламає ні збірку, ні тести — курник просто стає безглуздим, і помітити це
 * можна лише пальцем.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React: ефектів тут немає, а отже перед нами **стартовий** стан партії.
 *
 * @module web-platform-dev/src/pages/games/NupogodiGame.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NupogodiGame } from "./NupogodiGame";
import { LANES, lanePercent } from "./henhouse";

const HTML = renderToStaticMarkup(<NupogodiGame />);

/** Усі адреси однакових кнопок — у порядку, як вони стоять на екрані. */
function labels(markup: string, what: string): string[] {
  return [...markup.matchAll(new RegExp(`aria-label="(${what} \\d)"`, "g"))].map(
    (match) => match[1] ?? "",
  );
}

describe("екран партії", () => {
  it("малює курник, а не порожню форму", () => {
    expect(HTML).toContain("wb-nupogodi");
    expect(HTML).toContain("wb-nupogodi-hens");
    expect(HTML).toContain("wb-nupogodi-fall");
    expect(HTML).toContain("wb-nupogodi-wolf");
    expect(HTML).toContain("wb-nupogodi-basket");
  });

  it("у кожної курки своя доріжка — звідти й чекати яйце", () => {
    expect(labels(HTML, "Курка")).toHaveLength(LANES);
    expect(HTML).toContain(`left:${lanePercent(0)}%`);
    expect(HTML).toContain(`left:${lanePercent(LANES - 1)}%`);
  });

  it("у кожної доріжки є адреса: дотик має куди вести", () => {
    const lanes = labels(HTML, "Доріжка");
    expect(lanes).toHaveLength(LANES);
    expect(new Set(lanes).size).toBe(LANES);
  });

  it("вовк стоїть посередині — за такою ж геометрією, як і доріжки", () => {
    // Стартова позиція — з правил: екран не має власного числа для центру
    expect(HTML).toContain(`left:${lanePercent(Math.floor(LANES / 2))}%`);
  });

  it("життя видно слотами й кожен слот має імʼя", () => {
    const slots = [...HTML.matchAll(/aria-label="(життя|життя втрачено)"/g)];

    expect(slots).toHaveLength(3);
    expect(slots.every((slot) => slot[1] === "життя")).toBe(true);
  });

  it("звук можна вимкнути, і стан чути в самій кнопці", () => {
    expect(HTML).toContain('aria-pressed="true"');
    expect(HTML).toContain("Вимкнути звук");
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
