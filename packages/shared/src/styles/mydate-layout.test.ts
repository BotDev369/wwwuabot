/**
 * Сторож картки «Дати» на телефоні (`mydate.css`).
 *
 * Читається як текст: розбору CSS у тестовому середовищі немає
 * (`environment: node`) — так само, як у `chrome.test.ts`.
 *
 * @module packages/shared/src/styles/mydate-layout.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./mydate.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Телефонна частина файлу — усе, що стоїть після маркера медіазапиту. */
const [wide, phone = ""] = css.split("@media (max-width: 520px)");

/** Тіло блоку від `{` до парної `}` — разом із вкладеними, як у CSSOM. */
function body(scope: string, open: number): string {
  let depth = 0;
  for (let i = open; i < scope.length; i++) {
    if (scope[i] === "{") depth++;
    else if (scope[i] === "}" && --depth === 0) return scope.slice(open, i);
  }
  throw new Error("блок не закритий");
}

/**
 * Блок правила. Пошук чіпляється за межу блоку (`}` або початок області), а не
 * за рядок: у списку селекторів (`.wb-date-list,\n  .wb-date-row {`) останній
 * рядок — не окреме правило, і без цієї межі береться чуже тіло.
 */
function block(scope: string, match: (head: string) => boolean): string {
  const pattern = /(?:^|[{}])\s*([^{}\s][^{}]*?)\s*\{/g;
  const found = [...scope.matchAll(pattern)].find(([, head]) => match(head.trim()));
  expect(found, "блок мусить існувати").toBeDefined();
  return body(scope, scope.indexOf("{", found?.index));
}

/** Правило з одним селектором. */
function rule(scope: string, selector: string): string {
  return block(scope, (head) => head === selector);
}

/** Блок групового селектора: `selector` — один із пунктів списку. */
function group(scope: string, selector: string): string {
  return block(scope, (head) => head.split(",").some((part) => part.trim() === selector));
}

describe("рядок списку стає карткою", () => {
  it("таблиця ламається на всіх рівнях, а не лише на `tr`", () => {
    // `display: block` тільки на `tr`/`td` лишає табличну розкладку, і колонки
    // роз'їжджаються — це була перша версія картки.
    for (const selector of [".wb-date-list", ".wb-date-list > table", ".wb-date-list tbody"]) {
      expect(group(phone, selector), selector).toContain("display: block");
    }
    expect(group(phone, ".wb-date-row"), ".wb-date-row").toContain("display: block");
  });

  it("комірка перебиває бренд-відступи своїм `padding`, а не тільки довшим селектором", () => {
    // `android.css` дає `.wb-table td` відступи `12px 16px !important`, тож без
    // `!important` тут картка знову стає таблицею.
    const cell = rule(phone, ".wb-date-list .wb-table td.wb-date-cell");
    expect(cell).toContain("display: flex");
    expect(cell).toContain("padding: 2px 0 !important");
  });

  it("назва картки більша за поля й перебиває бренд-розмір `td`", () => {
    const name = rule(phone, ".wb-date-list .wb-table td.wb-date-cell--name");
    expect(name).toContain("font-size: var(--text-md) !important");
  });

  it("зебра таблиці не фарбує картку: тло лишається за вибраним рядком", () => {
    // У `components.css` зебра стоїть на `td`, тож у картці це була окрема
    // смуга під кожним полем плюс пляма за чекбоксом — і вона вилазила за межі.
    expect(rule(phone, ".wb-date-list tbody tr:nth-child(even) td")).toContain(
      "background: transparent",
    );
  });
});

describe("картка — акордеон", () => {
  it("згорнута картка показує лише голову", () => {
    // Селектор довший за правило комірки (`display: flex`) — інакше тіло
    // згорнутої картки лишалось би видимим.
    expect(
      rule(phone, ".wb-date-list .wb-date-row:not(.wb-date-row--open) .wb-date-cell--body"),
    ).toContain("display: none");
  });

  it("дату показує голова, а не окрема комірка картки", () => {
    expect(rule(phone, ".wb-date-list .wb-table td.wb-date-cell--date")).toContain("display: none");
  });

  it("дата й каретка існують лише в картці", () => {
    // У таблиці вони сховані одним правилом на два селектори — звідси `group`.
    for (const selector of [".wb-date-name__meta", ".wb-date-name__caret"]) {
      expect(group(wide, selector), selector).toContain("display: none");
      expect(rule(phone, selector), selector).not.toContain("display: none");
    }
  });

  it("у таблиці правка — окремою кнопкою, у картці — у тілі", () => {
    // Одна дія, два місця: що саме видно, вирішує ширина екрана.
    expect(rule(wide, ".wb-date-edit")).toContain("inline-flex");
    expect(rule(phone, ".wb-date-edit")).toContain("display: none");
    expect(rule(wide, ".wb-date-cell--actions")).toContain("display: none");
    expect(rule(phone, ".wb-date-cell--actions")).toContain("flex-end");
  });

  it("картка не роздувається відступами — висоту задає голова", () => {
    // Згорнута картка = рядок + голова 44px; відступи лише обрамляють її.
    expect(rule(phone, ".wb-date-row")).toContain(
      "padding: var(--sp-1) var(--sp-2) var(--sp-1) var(--sp-3)",
    );
    expect(rule(phone, ".wb-date-list .wb-table td.wb-date-cell--name")).toContain(
      "padding: 0 52px 0 0 !important",
    );
  });

  it("текст не тулиться до лівого краю картки, а чекбокс — по центру її висоти", () => {
    // Сам чекбокс висить по центру: жорсткий `top` на нижчій картці виглядав би
    // зсунутим (розмір поля — у сторожі «чекбокс добору»).
    const pick = rule(phone, ".wb-date-cell--pick");
    expect(pick).toContain("top: 50%");
    expect(pick).toContain("translateY(-50%)");
  });

  it("відкриту картку видно за акцентною кареткою", () => {
    expect(rule(phone, ".wb-date-row--open .wb-date-name__caret")).toContain("var(--accent)");
  });
});

describe("чекбокс добору", () => {
  it("має розмір знака, а не 44px квадрат", () => {
    const box = rule(wide, '.wb-date-list input[type="checkbox"]');
    expect(box).toContain("width: 22px");
    expect(box).toContain("height: 22px");
    expect(box).not.toContain("44px");
  });

  it("у картці стоїть у власному полі 44×44 і не наїжджає на поля", () => {
    const pick = rule(phone, ".wb-date-cell--pick");
    expect(pick).toContain("position: absolute");
    expect(pick).toContain("right: var(--sp-2)");
    expect(pick).toContain("width: 44px");
    expect(pick).toContain("height: 44px");
    // Абсолютна комірка чіпляється до рядка — той мусить бути контейнером.
    expect(rule(phone, ".wb-date-row")).toContain("position: relative");
  });
});

describe("нотатки", () => {
  it("на десктопі — один рядок із багатокрапкою", () => {
    expect(rule(wide, ".wb-date-cell--notes")).toContain("max-width: 200px");
  });

  it("у картці обрізання знімається — інакше картка звужується до 200px", () => {
    const notes = rule(phone, ".wb-date-cell--notes");
    expect(notes).toContain("max-width: none");
    expect(notes).toContain("white-space: normal");
  });
});

describe("керування списком", () => {
  it("панель вибірки переноситься, а не обрізається праворуч", () => {
    expect(rule(wide, ".wb-date-bulk")).toContain("flex-wrap: wrap");
    expect(rule(phone, ".wb-date-bulk__count")).toContain("flex: 0 0 100%");
  });

  it("сортування на телефоні — власний рядок, бо заголовків колонок немає", () => {
    expect(rule(wide, ".wb-date-sort")).toContain("display: none");
    expect(rule(phone, ".wb-date-sort")).toContain("display: flex");
  });
});
