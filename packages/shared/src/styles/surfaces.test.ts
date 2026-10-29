/**
 * Картка, заголовок і порожній стан — **одні мірки на весь продукт**.
 *
 * Після рядків списку (`rows.test.ts`) лишалась та сама хвороба на рівні вище:
 * «картка» була 20px берегів на екрані акаунта, 16px із рамкою — у результату
 * тесту, 18px із градієнтом — у профілю, а «частина сторінки» — 15/700 в
 * одному місці, 17/700 у другому й 13/700 у третьому. Кожен екран виглядав
 * окремим продуктом.
 *
 * Два сторожі:
 *
 *  1. **Мірки картки й заголовка — токени** (`--card-*`, `--heading-*`):
 *     власний `padding`/`font-size` у правила картки — падіння.
 *  2. **Один селектор — один файл.** `.wb-profile` був і карткою акаунта
 *     (`app-chrome.css`), і блоком результату (`assessments.css`): блок
 *     результату успадковував чужий градієнт, тінь і береги, і побачити це
 *     можна було лише очима на телефоні.
 *
 * CSS читається як текст: у тестовому середовищі немає CSSOM (`buttons.test.ts`).
 *
 * @module packages/shared/src/styles/surfaces.test
 */

import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = readdirSync(new URL(".", import.meta.url))
  .filter((name) => name.endsWith(".css"))
  .sort();

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

describe("токени картки й заголовків", () => {
  it("об'являються в tokens.css", () => {
    for (const token of [
      "--card-bg",
      "--card-radius",
      "--card-pad",
      "--card-gap",
      "--card-shadow",
      "--heading-section-size",
      "--heading-section-weight",
      "--heading-card-size",
      "--heading-card-weight",
      "--heading-group-size",
      "--heading-group-weight",
    ]) {
      expect(tokens, token).toContain(`${token}:`);
    }
  });
});

describe("картка бере мірки токенами", () => {
  const cases: [string, string, string[]][] = [
    [
      "components.css",
      ".wb-card",
      ["background: var(--card-bg)", "border-radius: var(--card-radius)"],
    ],
    ["components.css", ".wb-card-header", ["padding: var(--card-pad)"]],
    ["components.css", ".wb-card-body", ["padding: var(--card-pad)"]],
    [
      "assessments.css",
      ".wb-test-card",
      ["padding: var(--card-pad)", "border-radius: var(--card-radius)"],
    ],
    ["assessments.css", ".wb-combined", ["padding: var(--card-pad)", "background: var(--card-bg)"]],
    ["app-chrome.css", ".wb-profile", ["padding: var(--card-pad)", "background: var(--card-bg)"]],
    [
      "app-chrome.css",
      ".wb-person",
      ["padding: var(--card-pad)", "border-radius: var(--card-radius)"],
    ],
  ];

  for (const [file, selector, fragments] of cases) {
    it(`${selector} у ${file}`, () => {
      const body = rule(css(file), selector);
      for (const fragment of fragments)
        expect(body, `${selector}: ${fragment}`).toContain(fragment);
    });
  }

  it("картка описана ОДИН раз — кирпичиком, а не другим шаром", () => {
    // Поки тло, радіус і тінь картки стояли в другому стилі з `!important`,
    // будь-яка правка `components.css` була невидимою, а новий екран із
    // власним `box-shadow` отримував іншу картку. Тепер місце одне — і кожна
    // мірка читається токеном.
    const card = rule(css("components.css"), ".wb-card");
    for (const fragment of [
      "background: var(--card-bg)",
      "border-radius: var(--card-radius)",
      "box-shadow: var(--card-shadow)",
    ]) {
      expect(card, fragment).toContain(fragment);
    }
    expect(card, "картка без `!important`").not.toContain("!important");
  });

  it("картка не малює рамки — місце відділяє поверхня (правило 15)", () => {
    for (const selector of [".wb-test-card", ".wb-combined"]) {
      expect(rule(css("assessments.css"), selector)).not.toContain("border:");
    }
  });
});

describe("заголовки всередині екрана — три ролі, по одній мірі", () => {
  it("частина сторінки", () => {
    for (const selector of [
      ".wb-section-title",
      ".wb-alerts-title",
      ".wb-scale-result-title",
      ".wb-combined-title",
      ".wb-run-block-title",
      ".wb-safety-title",
    ]) {
      const body = rule(css("assessments.css"), selector);
      expect(body, selector).toContain("font-size: var(--heading-section-size)");
      expect(body, selector).toContain("font-weight: var(--heading-section-weight)");
    }
  });

  it("заголовок частини сторінки не воює зі стилем через `!important`", () => {
    // Типовий стиль типографіку елементів не піднімає (`typography.test.ts`),
    // тож `!important` у заголовка — це вже борг, а не захист.
    for (const selector of [
      ".wb-section-title",
      ".wb-alerts-title",
      ".wb-scale-result-title",
      ".wb-combined-title",
    ]) {
      expect(rule(css("assessments.css"), selector), selector).not.toContain("!important");
    }
  });

  it("назва картки й підпис групи — теж токени", () => {
    expect(rule(css("components.css"), ".wb-card-title")).toContain(
      "font-size: var(--heading-card-size)",
    );
    for (const [file, selector] of [
      ["components.css", ".wb-note-group-title"],
      ["contacts.css", ".wb-contact-group-title"],
      ["messages.css", ".wb-conv-group-title"],
    ]) {
      const body = rule(css(file), selector);
      expect(body, selector).toContain("font-size: var(--heading-group-size)");
      expect(body, selector).toContain("font-weight: var(--heading-group-weight)");
    }
  });
});

describe("один селектор — один файл", () => {
  it("клас не описується у двох файлах стилів", () => {
    const owners = new Map<string, Set<string>>();
    for (const file of FILES) {
      for (const match of css(file).matchAll(/(?:^|\n)([^\n{}@]+)\{/g)) {
        const selector = match[1].trim();
        if (!selector.startsWith(".")) continue;
        const files = owners.get(selector) ?? new Set<string>();
        files.add(file);
        owners.set(selector, files);
      }
    }
    // Два правила одного класу в ОДНОМУ файлі — це каскад і медіазапити, норма.
    // Два файли — два значення того самого елемента, і саме це ловимо.
    const duplicates = [...owners]
      .filter(([, files]) => files.size > 1)
      .map(([selector, files]) => `${selector} — ${[...files].join(", ")}`);
    expect(duplicates, "два значення одного класу = два вигляди одного елемента").toEqual([]);
  });
});

describe("порожній стан — один кирпичик", () => {
  it("його мірки живуть тільки в components.css", () => {
    for (const file of FILES) {
      if (file === "components.css") continue;
      expect(css(file), `${file} не має описувати .wb-empty`).not.toMatch(/\n\.wb-empty[ .{]/);
    }
  });
});
