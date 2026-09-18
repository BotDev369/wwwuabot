/**
 * Сторож меню: **плитки — по дві в ряду, низ — зона пальця, а смуга внизу не
 * прокручується**.
 *
 * Чому це тест, а не коментар. Кожна з цих речей ламається мовчки: `grid` без
 * `repeat(2, …)` стає одним стовпчиком (меню знову смуги на всю ширину),
 * притискання до низу, переписане на `justify-content: flex-end`, у тіла з
 * `overflow-y: auto` обрізає початок вмісту, коли той вищий за екран — і пункт,
 * який зник, ніхто не побачить, бо зник він угорі. А смуга з «закрити»,
 * переїхавши з сестри тіла в останній рядок тіла, тихо починає їхати разом із
 * вмістом — тобто зникає саме тоді, коли її шукають.
 *
 * Розбору CSS у тестовому середовищі немає (environment: node, без DOM), тож
 * CSS читається як текст — так само зроблено в `buttons.test.ts` і
 * `fields.test.ts`.
 *
 * @module packages/shared/src/styles/menu.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const CSS = readFileSync(
  join(REPO_ROOT, "packages/shared/src/styles/components.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

interface Rule {
  selector: string;
  body: string;
}

const RULES: Rule[] = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.replace(/\s+/g, " ").trim(),
  body,
}));

/** Останнє правило для селектора — те, що справді діє при рівній специфічності. */
function rule(selector: string): Rule | undefined {
  return RULES.filter((entry) => entry.selector === selector).at(-1);
}

describe("меню: плитки й притискання до низу", () => {
  it("плитки — рівно дві в ряду", () => {
    const blocks = rule(".wb-menu-blocks");
    expect(blocks, "правило .wb-menu-blocks мусить існувати").toBeDefined();
    expect(blocks?.body).toContain("display: grid");
    // `minmax(0, 1fr)`, а не `1fr`: довгий підпис інакше розпирав би колонку й
    // вилазив за екран замість того, щоб перенестись.
    expect(blocks?.body).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });

  it("плитка — кнопка: тло, радіус і висота не менша за палець", () => {
    const block = rule(".wb-menu-block");
    expect(block, "правило .wb-menu-block мусить існувати").toBeDefined();
    expect(block?.body).toContain("background: var(--field-bg)");
    expect(block?.body).toContain("border-radius: var(--radius-md)");
    const minHeight = Number(block?.body.match(/min-height:\s*(\d+)px/)?.[1]);
    expect(minHeight).toBeGreaterThanOrEqual(44);
  });

  it("іконка готового розділу — акцентна, заглушка лишається приглушеною", () => {
    // Це не оформлення, а різниця станів: у сітці однакових плиток око не
    // бачило, які з них уже працюють. Заглушка не отримує нічого — її стан
    // уже показано кирпичиком `.wb-badge` і приглушеним підписом.
    const accent = rule(".wb-menu-block:not(.wb-menu-block--soon) .wb-menu-block-icon");
    expect(accent, "правило акцентної іконки мусить існувати").toBeDefined();
    expect(accent?.body).toContain("color: var(--accent)");
    expect(rule(".wb-menu-block--soon .wb-menu-block-icon")).toBeUndefined();
  });

  it("вміст притискається до низу через `margin-top: auto`, а не флексом", () => {
    // `justify-content: flex-end` у скролованого тіла обрізає початок вмісту:
    // те, що не влізло, стає недосяжним. `margin-top: auto` тисне лише тоді,
    // коли місце справді є.
    const body = rule(".wb-menu-body--end > :first-child");
    expect(body, "правило притискання мусить існувати").toBeDefined();
    expect(body?.body).toContain("margin-top: auto");
    for (const entry of RULES) {
      if (!entry.selector.includes("wb-menu-body--end")) continue;
      expect(entry.body, entry.selector).not.toContain("justify-content");
    }
  });

  it("облікові картки — у дві колонки, і ділять вільний простір", () => {
    // Дві речі ламаються мовчки: `grid` без `repeat(2, …)` стає одним
    // стовпчиком (картка знову смуга, як пункт), а втрачений `flex: 1`
    // повертає порожнечу під заголовком — меню при цьому робоче, тож ніхто
    // й не помітить.
    const cards = rule(".wb-menu-account");
    expect(cards, "правило .wb-menu-account мусить існувати").toBeDefined();
    expect(cards?.body).toContain("display: grid");
    // `minmax(0, 1fr)`, а не `1fr`: довге ім'я інакше розпирає колонку й
    // вилазить за екран замість того, щоб перенестись.
    expect(cards?.body).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");

    const grow = rule(".wb-menu-body--end > .wb-menu-account");
    expect(grow, "рости картки мусять лише в притиснутому вмісті").toBeDefined();
    expect(grow?.body).toContain("flex: 1");
  });

  it("облікова картка — кнопка: тло, радіус і висота не менша за палець", () => {
    const card = rule(".wb-menu-account-card");
    expect(card, "правило .wb-menu-account-card мусить існувати").toBeDefined();
    expect(card?.body).toContain("background: var(--field-bg)");
    expect(card?.body).toContain("border-radius: var(--radius-md)");
    const minHeight = Number(card?.body.match(/min-height:\s*(\d+)px/)?.[1]);
    expect(minHeight).toBeGreaterThanOrEqual(44);
  });

  it("рядкова розкладка — одна на ВСІ картки: і облікові, і плитки", () => {
    // Один перемикач міняє обидві родини карток. Якби рядками ставали лише
    // облікові, поруч із ними стояли б плитки — і це читалось би як зламаний
    // перемикач, а не як вибір вигляду.
    const oneColumn = rule(
      ".wb-menu-body--cards-rows .wb-menu-blocks, .wb-menu-body--cards-rows .wb-menu-account",
    );
    expect(oneColumn, "правило рядкової розкладки мусить існувати").toBeDefined();
    expect(oneColumn?.body).toContain("grid-template-columns: 1fr");

    // Обидві родини стають смугами — інакше це не рядок, а та сама колонка.
    expect(rule(".wb-menu-body--cards-rows .wb-menu-block")?.body).toContain("flex-direction: row");
    expect(rule(".wb-menu-body--cards-rows .wb-menu-account-card")?.body).toContain(
      "flex-direction: row",
    );
    // Текст у рядку читають зліва направо, а не по центру смуги.
    expect(rule(".wb-menu-body--cards-rows .wb-menu-account-text")?.body).toContain(
      "align-items: flex-start",
    );
    // Галочка вибору в рядку замикає рядок, а не висить у куті, як у плитці.
    expect(rule(".wb-menu-body--cards-rows .wb-menu-block .wb-menu-item-check")?.body).toContain(
      "position: static",
    );
    // Розкладку тримає клас на ТІЛІ поверхні: модифікатор на самій картці — це
    // друге місце, де вибір можна забути оновити, і саме так картки розійшлися б
    // із плитками.
    expect(rule(".wb-menu-account--rows")).toBeUndefined();
  });
});

/**
 * Поверхня на весь екран і смуга внизу — те, що ламається тихо.
 *
 * Три речі тут не косметичні: (1) повноекранна поверхня мусить лишити місце
 * під футером застосунку — інакше її нижня кнопка опиняється ПІД смугою, яку
 * `--z-tabbar` малює над модалкою; (2) смуга з «закрити» і перемикачем — сестра
 * тіла з `flex-shrink: 0`, а не останній рядок у тілі з `overflow-y: auto`, бо
 * тоді вона їде разом із вмістом; (3) сегмент перемикача не менший за палець.
 */
describe("меню: поверхня на весь екран і смуга внизу", () => {
  it("повноекранний оверлей — не скрим, а сама сторінка", () => {
    // Крізь напівпрозорий скрим під футером просвічував контент застосунку, і
    // поверхня розпадалась на дві частини з чорними плямами по краях. Заливка
    // мусить бути така сама, як у самої поверхні.
    const overlay = rule(".wb-modal-overlay--screen");
    expect(overlay?.body).toContain("background: var(--surface)");
    expect(overlay?.body).not.toContain("--surface-overlay");
    expect(rule(".wb-modal")?.body).toContain("background: var(--surface)");
  });

  it("закруглення знімається парою класів — інакше медіа-запит виграє за порядком", () => {
    // `.wb-sheet` на телефоні задає радіус із тією самою специфічністю (0,1,0):
    // одинак залежав би від порядку рядків у файлу, а порядок тут міняється.
    const screen = rule(".wb-modal.wb-modal--screen");
    expect(screen, "правило повноекранної поверхні мусить існувати").toBeDefined();
    expect(screen?.body).toContain("border-radius: 0");
    expect(screen?.body).toContain("max-width: none");
    expect(rule(".wb-modal--screen"), "специфічність — тільки парою").toBeUndefined();
  });

  it("місце під футером застосунку лишається навіть на весь екран", () => {
    const overlay = rule(".wb-modal-overlay--screen");
    expect(overlay, "правило оверлея мусить існувати").toBeDefined();
    expect(overlay?.body).toContain("padding: 0");

    const withTabBar = rule("html:has(.wb-tabbar) .wb-modal-overlay--screen");
    expect(withTabBar, "без цього нижня кнопка піде під смугу футера").toBeDefined();
    expect(withTabBar?.body).toContain("padding-bottom: var(--tab-bar-h)");
  });

  it("смуга внизу — сестра тіла, а не останній рядок у ньому", () => {
    const bar = rule(".wb-sheet-bar");
    expect(bar, "правило .wb-sheet-bar мусить існувати").toBeDefined();
    expect(bar?.body).toContain("flex-shrink: 0");
    // Безпечна зона знизу — тут: смуга остання на екрані.
    expect(bar?.body).toContain("var(--safe-bottom)");
    // Мірки контролів — їхні власні: у смузі стоять коло й перемикач, а не дві
    // половини смуги (розтягнутий вихід читався прапором на всю ширину).
    expect(rule(".wb-sheet-bar > *")?.body).toContain("flex: 0 0 auto");
  });

  it("сегмент перемикача не менший за палець, і вибраний видно", () => {
    const btn = rule(".wb-segmented-btn");
    expect(btn, "правило .wb-segmented-btn мусить існувати").toBeDefined();
    const minHeight = Number(btn?.body.match(/min-height:\s*(\d+)px/)?.[1]);
    expect(minHeight).toBeGreaterThanOrEqual(44);
    // Знак без підпису мусить лишатись квадратом пальця: ширина — теж 44.
    const minWidth = Number(btn?.body.match(/min-width:\s*(\d+)px/)?.[1]);
    expect(minWidth).toBeGreaterThanOrEqual(44);
    // Підписів у сегменті немає — інакше він з'їдав би пів смуги, яку ділить із
    // «закрити»; ім'я варіанта живе в `aria-label`.
    expect(rule(".wb-segmented-label")).toBeUndefined();
  });

  it("смуга внизу: контроли по центру, вихід — коло на акцентному тлі", () => {
    // Розтягнута смуга робила з виходу прапор на всю ширину; тепер це два
    // контроли за шириною вмісту, і стоять вони по центру.
    const bar = rule(".wb-sheet-bar");
    expect(bar?.body).toContain("justify-content: center");
    expect(rule(".wb-sheet-bar > *")?.body).toContain("flex: 0 0 auto");

    // Коло мусить лишатись колом: і квадратним (44 — планка пальця), і круглим.
    const close = rule(".wb-sheet-bar-close");
    expect(close, "правило виходу мусить існувати").toBeDefined();
    expect(close?.body).toContain("border-radius: var(--radius-full)");
    expect(close?.body).toContain("background: var(--accent)");
    expect(close?.body).toContain("color: var(--text-inverse)");
    const size = Number(close?.body.match(/width:\s*(\d+)px/)?.[1]);
    expect(size).toBeGreaterThanOrEqual(44);
    expect(close?.body).toContain(`height: ${size}px`);
    // `padding: 0` — не косметика: це той самий бокс 44×44 без внутрішніх
    // мірок, які зробили б із кола овал.
    expect(close?.body).toContain("padding: 0");
  });

  it("у перемикача немає треку, а вибраний показує акцентний колір", () => {
    // Трек (сіра плитка під двома знаками) читався як ще одна кнопка поруч із
    // акцентним виходом — тож його не має бути ні заливкою, ні радіусом.
    const track = rule(".wb-segmented");
    expect(track, "правило .wb-segmented мусить існувати").toBeDefined();
    expect(track?.body).not.toContain("background");
    expect(track?.body).not.toContain("padding");

    // Стан видно **кольором знака**, а не заливкою сегмента.
    const active = rule(".wb-segmented-btn--active");
    expect(active, "правило вибраного сегмента мусить існувати").toBeDefined();
    expect(active?.body).toContain("color: var(--accent)");
    expect(active?.body).not.toContain("background");
    // І штрихом: сам лише відтінок на тонкому знаку читається слабко.
    expect(rule(".wb-segmented-btn--active svg")?.body).toContain("stroke-width");
  });
});
