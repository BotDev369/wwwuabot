/**
 * Сторож закріпленої шапки таблиць «Дати» (`date-analysis.css`).
 *
 * Читається як текст: розбору CSS у тестовому середовищі немає
 * (`environment: node`) — так само, як у `dates.test.ts`.
 *
 * @module packages/shared/src/styles/date-analysis.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./date-analysis.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Тіло блоку від `{` до парної `}` — разом із вкладеними. */
function body(open: number): string {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open, i);
  }
  throw new Error("блок не закритий");
}

/** Тіло правила: селектор мусить стояти на початку рядка — інакше знайдеться хвіст чужого. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = new RegExp(`(?:^|\\n)${escaped} \\{`).exec(css);
  expect(found, `${selector}: правила немає`).not.toBeNull();
  return body(css.indexOf("{", found?.index ?? 0));
}

describe("шапка таблиці лишається на видноті", () => {
  it("рамка гортає себе — інакше першому стовпцю ніде закріпитись", () => {
    // Закріплене тримається краю того, хто скролить. Поки скролила сторінка,
    // закріпити стовпець було нічим. Висота обмежена: без вільної висоти
    // `sticky` не має куди тримати.
    const frame = rule(".wb-param-frame:has(thead)");
    expect(frame).toContain("overflow: auto");
    expect(frame).toContain("max-height");

    // Вітрина систем шапки не має — вона лишається потоком сторінки, а не ще
    // однією смугою скролу навколо акордеонів.
    expect(rule(".wb-param-frame")).not.toContain("overflow");
  });

  it("шапка липне до верху рамки, а не зсувається під хедер", () => {
    // Рамка — сам контейнер скролу, тож шапка тримається її верхнього краю:
    // зсув на висоту хедера більше не потрібен і лишав би дірку під шапкою.
    const head = rule(".wb-param-table th");
    expect(head).toContain("position: sticky");
    expect(head).toContain("top: 0");
    expect(css).not.toContain(".wb-tabbar-layout .wb-param-table th");
  });

  it("перший стовпець закріплений, а пояснення — ні", () => {
    // Підпис рядка лишається при гортанні вбік. Пояснення (опис системи,
    // пояснення параметра) — текст на всю ширину: закріплена прозора комірка
    // показувала б крізь себе те, що проїжджає.
    expect(
      rule(
        ".wb-param-table .wb-param-detail > td:first-child,\n.wb-param-table .wb-system-body > td:first-child",
      ),
    ).toContain("position: static");
  });

  it("верхній кант рамки не читається розділювачем під підписом блока", () => {
    // Обвідка давала волосяну лінію просто під підписом — з тією ж товщиною,
    // що й розділювачі між рядками, тож підпис виглядав першим рядком.
    const frame = rule(".wb-param-frame");
    expect(frame).not.toContain("border:");
    expect(frame).not.toContain("border-top");
    expect(frame).toContain("box-shadow");
    // Тла в рамки немає: поверхню несе рядок, а полотно під ним робило з опису
    // системи ще один рядок.
    expect(frame).not.toContain("background");
  });

  it("крайні рядки повторюють заокруглений кут рамки своїм тлом", () => {
    // Тло ряду прямокутне, а рамка заокруглена — і обрізає вміст не завжди:
    // гортає себе лише рамка з шапкою, а вітрина систем лишається потоком,
    // тож кути їй дають самі комірки.
    expect(rule(".wb-param-table tbody:first-child tr:first-child > td:first-child")).toContain(
      "border-top-left-radius: var(--radius-md)",
    );
    expect(rule(".wb-param-table tbody tr:last-child > td:last-child")).toContain(
      "border-bottom-right-radius: var(--radius-md)",
    );
  });

  it("підакордеони параметрів не тримають вертикальної смуги", () => {
    // Вкладеність показує зсув: підпис параметра стоїть на крок глибше за
    // назву системи. Смуга була другою межею в списку, побудованому на берегах.
    expect(rule(".wb-system-params")).not.toContain("border-left");
  });

  it("текст списку — крок базового, а не дрібніший", () => {
    expect(rule(".wb-param-table")).toContain("font-size: var(--text-base)");
  });

  it("підпис над таблицею має просвіт — інакше читається як перша комірка", () => {
    expect(rule(".wb-block-date-analysis__title")).toContain("margin-bottom: var(--sp-4)");
  });

  it("кути шапки повторюють рамку — її більше не обрізає `overflow`", () => {
    // Прямокутник шапки з непрозорим тлом вилазив за заокруглені кути рамки.
    expect(rule(".wb-param-table thead th:first-child")).toContain("border-top-left-radius");
    expect(rule(".wb-param-table thead th:last-child")).toContain("border-top-right-radius");
  });

  it("стовпці аналізу роз'їжджаються вбік, а не рвуть значення", () => {
    // `fixed` стискав усі дати в екран — значення ламались по складах. Тепер
    // ширину дає вміст, а зайве гортає рамка.
    expect(
      rule(".wb-param-table--compare thead th,\n.wb-param-table--compare .wb-param-value"),
    ).toContain("white-space: nowrap");
    expect(rule(".wb-param-table--compare thead th + th")).toContain("min-width: 5.5rem");
  });
});

describe("тло належить рядкам", () => {
  it("рядок несе поверхню, а опис системи — ні", () => {
    // Назва, опис і підакордеони лежали на одному тлі — система читалась одним
    // сірим полотном. Поверхню несе рядок: шапка — підсвітка акцентом, підпис
    // параметра — `--bg-2`; опис системи — не рядок, тла він не має.
    expect(rule(".wb-param-group > td .wb-param-toggle--open")).toContain(
      "background: var(--accent-soft)",
    );
    expect(rule(".wb-param-table td")).toContain("background: var(--bg-2)");
    expect(
      rule(".wb-system-params > .wb-param-toggle,\n.wb-system-params > .wb-param-label"),
    ).toContain("background: var(--bg-2)");
    expect(rule(".wb-system-body > td")).toContain("background: transparent");
  });

  it("пояснення параметра теж не рядок — тла не має", () => {
    expect(rule(".wb-param-detail td")).toContain("background: transparent");
  });

  it("панель навколо параметрів тла не має — поверхня на самих рядках", () => {
    // Залите тло під усіма параметрами читалось зайвою підкладкою під їхніми
    // описами.
    expect(rule(".wb-system-params")).not.toContain("background");
  });

  it("рядок списку вищий за голий тап-таргет — інакше список наляпистий", () => {
    // Рядки стояли один під одним із берегами 44px: береги є, а повітря нема.
    const toggle = rule(".wb-param-toggle");
    expect(toggle).toContain("min-height: 48px");
    expect(toggle).toContain("padding: var(--sp-1) var(--sp-3)");
  });

  it("назва системи на крок більша за власні параметри", () => {
    // Підпис групи, а не ще один рядок списку.
    expect(rule(".wb-analysis-systems__name")).toContain("font-size: var(--text-md)");
  });

  it("шапка першої системи повторює заокруглення рамки", () => {
    // Підсвітка стоїть на кнопці — без заокруглення вона лягала б на верхній
    // кут рамки власним квадратом.
    const head = rule(".wb-param-table tbody tr:first-child > td > .wb-param-toggle--open");
    expect(head).toContain("border-top-left-radius: var(--radius-md)");
    expect(head).toContain("border-top-right-radius: var(--radius-md)");
  });

  it("дотик лишається сильнішим за підсвітку розкритого рядка", () => {
    // Інакше саме розкрита шапка не відповідала б на палець: підсвітка має
    // вищу специфічність, тож `:active` бере її — префіксом таблиці.
    expect(rule(".wb-param-table .wb-param-toggle:active")).toContain(
      "background: var(--surface-active)",
    );
  });
});
