/**
 * Рядок списку — **одна геометрія на весь продукт**.
 *
 * Власник 29.10.2026 показав чотири екрани поспіль і сказав: «нуль єдиного
 * стилю, кожен екран живе своїм життям». Причина була не в смаку: кожен список
 * брав власні числа, і назва акордеона — це `<h2>`, який бренд піднімає до
 * 22px/500, — стояла поруч із підписом пункту меню 14px/500. Око читало це як
 * два різні продукти, а не як один список.
 *
 * Тому мірки рядка живуть у `tokens.css` (`--row-*`), і цим тестом вони
 * **зобов'язані** бути в правилі рядка: власний `padding`, `font-size` чи
 * `border-radius` у рядка — дефект, а не «характер екрана». Тест читає CSS як
 * текст (у тестовому середовищі немає CSSOM) — так само, як `buttons.test.ts`.
 *
 * @module packages/shared/src/styles/rows.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function css(name: string): string {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

function rule(source: string, selector: string): string {
  const start = source.indexOf(`\n${selector} {`);
  expect(start, `правило ${selector} має існувати`).toBeGreaterThan(-1);
  const open = source.indexOf("{", start);
  const close = source.indexOf("\n}", open);
  return source.slice(open, close);
}

const tokens = css("tokens.css");
const components = css("components.css");
const favorites = css("favorites.css");
const trackers = css("trackers.css");

const ROW_TOKENS = [
  "--row-bg",
  "--row-radius",
  "--row-pad-y",
  "--row-pad-x",
  "--row-gap",
  "--row-min-h",
  "--row-title-size",
  "--row-title-weight",
  "--row-title-color",
];

describe("токени рядка", () => {
  it("об'являються один раз і в tokens.css", () => {
    for (const token of ROW_TOKENS) {
      expect(tokens, `${token} має бути в tokens.css`).toContain(`${token}:`);
    }
  });

  it("підпис рядка — не заголовок сторінки", () => {
    // 14px/500: назва пункту, а не назва екрана. Розмір приходить токеном, а
    // не брендовим `h2` — інакше кожен список виглядає своїм.
    expect(tokens).toContain("--row-title-size: var(--text-base);");
    expect(tokens).toContain("--row-title-weight: var(--weight-medium);");
  });
});

describe("рядок бере мірки токенами", () => {
  const cases: { file: string; source: string; selector: string; expect: string[] }[] = [
    {
      file: "components.css",
      source: components,
      selector: ".wb-menu-item",
      expect: [
        "gap: var(--row-gap)",
        "min-height: var(--row-min-h)",
        "padding: var(--row-pad-y) var(--row-pad-x)",
        "border-radius: var(--row-radius)",
        "background: var(--row-bg)",
      ],
    },
    {
      file: "components.css",
      source: components,
      selector: ".wb-block-section--row",
      expect: ["background: var(--row-bg)", "border-radius: var(--row-radius)"],
    },
    {
      file: "components.css",
      source: components,
      selector: ".wb-block-section--row .wb-block-section__head",
      expect: ["padding: var(--row-pad-y) var(--row-pad-x)"],
    },
    {
      file: "favorites.css",
      source: favorites,
      selector: ".wb-favorites-row",
      expect: ["background: var(--row-bg)", "border-radius: var(--row-radius)"],
    },
    {
      file: "favorites.css",
      source: favorites,
      selector: ".wb-favorites-open",
      expect: ["gap: var(--row-gap)", "min-height: var(--row-min-h)"],
    },
    {
      file: "trackers.css",
      source: trackers,
      selector: ".wb-group-head",
      expect: ["border-radius: var(--row-radius)"],
    },
    {
      file: "trackers.css",
      source: trackers,
      selector: ".wb-group-toggle",
      expect: ["gap: var(--row-gap)", "min-height: var(--row-min-h)"],
    },
  ];

  for (const item of cases) {
    it(`${item.selector} у ${item.file}`, () => {
      const body = rule(item.source, item.selector);
      for (const fragment of item.expect) {
        expect(body, `${item.selector}: ${fragment}`).toContain(fragment);
      }
    });
  }

  it("підписи всіх рядків — один розмір, вага й колір", () => {
    const labels: [string, string][] = [
      ["components.css", ".wb-menu-item-label"],
      ["components.css", ".wb-block-section--row .wb-block-section__title"],
      ["favorites.css", ".wb-favorites-title"],
      ["trackers.css", ".wb-group-title"],
    ];
    for (const [file, selector] of labels) {
      const body = rule(css(file), selector);
      expect(body, selector).toContain("font-size: var(--row-title-size)");
      expect(body, selector).toContain("font-weight: var(--row-title-weight)");
      expect(body, selector).toContain("color: var(--row-title-color)");
    }
  });
});

describe("рядок не повертає власні числа", () => {
  const rowRules: [string, string][] = [
    ["components.css", ".wb-menu-item"],
    ["components.css", ".wb-block-section--row"],
    ["components.css", ".wb-block-section--row .wb-block-section__head"],
    ["components.css", ".wb-block-section--row .wb-block-section__toggle"],
    ["components.css", ".wb-block-section--row .wb-block-section__title"],
    ["favorites.css", ".wb-favorites-row"],
    ["favorites.css", ".wb-favorites-open"],
    ["favorites.css", ".wb-favorites-title"],
    ["trackers.css", ".wb-group-head"],
    ["trackers.css", ".wb-group-toggle"],
    ["trackers.css", ".wb-group-title"],
  ];

  const pxProperties = /(?:padding|font-size|border-radius|min-height|gap|background)[^;]*\d+px/;

  for (const [file, selector] of rowRules) {
    it(`${selector} не міряє px напряму`, () => {
      const body = rule(css(file), selector);
      expect(body, `${selector}: мірки рядка — тільки токени --row-*`).not.toMatch(pxProperties);
    });
  }
});
