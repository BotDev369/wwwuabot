/**
 * Смуга керування нотатками — розмітка.
 *
 * Перевіряємо те, що легко зламати мовчки: що вибори стоять **клітинками без
 * підпису й заливки** (та сама клітинка, що у вкладок композера), що вибране
 * **не** пишеться в кнопках, а стоїть поруч знімним чипом, що типового вибору
 * чипа немає — інакше смуга перетворюється на три «овали», від яких ми й
 * тікали, — і що пошук у спокої стоїть **вузьким**, бо широке порожнє поле
 * забирало місце саме в тих трьох клітинок.
 *
 * Дві речі тут перевіряються **разом із CSS**: що смуга не переноситься на
 * другий рядок (інакше розкрите поле скидало клітинки вниз — рівно коли
 * людина зібралась друкувати) і що кільце фокуса малює оболонка поля, а не
 * внутрішній `.wb-input` (інакше в розкритому полі видно «поле в полі»).
 * Так само зроблено в `styles/fields.test.ts` — властивість, яку легко
 * зламати мовчки, тримає тест, а не коментар.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, і правила CSS, а не дотики: так само зроблено в
 * `composer/ComposerModal.test.tsx`.
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NotesToolbar } from "./NotesToolbar";
import { DEFAULT_NOTES_VIEW, type NotesView } from "./types";

/** Спільні стилі: розмітку смуги рендерить спільний модуль, тож і правила там. */
const CSS = readFileSync(
  join(
    fileURLToPath(new URL("../../../../", import.meta.url)),
    "packages/shared/src/styles/components.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Каркас сторінки: смуга їде в `wb-page-sticky` (шапка + смуга), тож шар, у
 * якому вона стоїть, — теж частина її поведінки, а не чужі стилі.
 */
const CHROME_CSS = readFileSync(
  join(
    fileURLToPath(new URL("../../../../", import.meta.url)),
    "packages/shared/src/styles/app-chrome.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** Тіло правила за селектором — щоб перевіряти саме його, а не файл цілком. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return CSS.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

/** Те саме, але для каркаса сторінки. */
function chrome(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return CHROME_CSS.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

const view = (over: Partial<NotesView> = {}): NotesView => ({ ...DEFAULT_NOTES_VIEW, ...over });

function render(
  over: Partial<NotesView> = {},
  counts = { shown: 3, total: 3 },
  allOpen = false,
): string {
  return renderToStaticMarkup(
    <NotesToolbar
      view={view(over)}
      onChange={() => {}}
      tags={["київ", "лал"]}
      shown={counts.shown}
      total={counts.total}
      allOpen={allOpen}
      onToggleAll={() => {}}
    />,
  );
}

/** Вміст клітинок-іконок: ним і перевіряємо, що знаки справді різні. */
function toolIcons(html: string): string[] {
  return [...html.matchAll(/<button[^>]*class="wb-tools-btn"[^>]*>(.*?)<\/button>/g)].map(
    (match) => match[1],
  );
}

/** Клітинка-перемикач цілком: у ній і стан, і знак. */
function toggleButton(html: string): string {
  return html.match(/<button[^>]*wb-tools-btn--toggle[\s\S]*?<\/button>/)?.[0] ?? "";
}

/** Підписи чипів: ними й перевіряємо, що кожен вибір знімається окремо. */
function chipLabels(html: string): string[] {
  return [...html.matchAll(/<span class="wb-tools-chip-label">(.*?)<\/span>/g)].map(
    (match) => match[1],
  );
}

describe("NotesToolbar", () => {
  it("три вибори стоять клітинками без підпису — ім'я лишається в aria-label", () => {
    const html = render();

    expect(toolIcons(html)).toHaveLength(3);
    expect(html).not.toContain("wb-btn");
    // Знак без підпису мусить бути названий, інакше кнопка безіменна.
    expect(html).toContain('aria-label="Сортування:');
    expect(html).toContain('aria-label="Групування:');
    expect(html).toContain('aria-label="Хештеги:');
  });

  it("у клітинці видно лише знак: вибраного в ній не пишемо", () => {
    // Це і була вимога: «Змінені» в кнопці займало пів екрана, а чип поруч
    // каже те саме коротко.
    const html = render({ sort: "created-desc" });

    for (const icon of toolIcons(html)) expect(icon).not.toContain("Нові");
    expect(html).not.toContain(">Спочатку нові<");
  });

  it("знаки трьох виборів різні — один і той самий знак нічого не каже", () => {
    // Було `list` / `blocks` / `hash`: перший читався як «список», другий як
    // «плитки», і жоден не казав про порядок чи групи.
    const icons = toolIcons(render());

    expect(new Set(icons).size).toBe(3);
  });

  it("типовий вибір чипа не має — інакше смуга повна завжди", () => {
    const html = render();

    expect(html).not.toContain("wb-tools-chip");
    expect(html).toContain("wb-tools-controls");
  });

  it("вибране стоїть поруч знімним чипом із назвою дії", () => {
    const html = render({ sort: "created-desc", tags: { kind: "tags", tags: ["київ"] } });

    expect(html).toContain("wb-tools-chip");
    expect(html).toContain(">Нові<");
    expect(html).toContain(">#київ<");
    expect(html).toContain("Прибрати фільтр за хештегом #київ");
    expect(html).toContain("Повернути типовий порядок");
  });

  it("кожен вибраний тег — окремий чип, і клітинка називає їх усі", () => {
    // Мультивибір у смузі читається саме так: два теги — два чипи, кожен
    // знімається окремо, а клітинка без підпису перелічує вибране в aria-label.
    const html = render({ tags: { kind: "tags", tags: ["київ", "лал"] } });

    expect(chipLabels(html)).toEqual(["#київ", "#лал"]);
    expect(html).toContain('aria-label="Хештеги: #київ, #лал"');
    expect(html).toContain("Прибрати фільтр за хештегом #лал");
  });

  it("без вибраних тегів клітинка каже «Усі теги»", () => {
    expect(render()).toContain('aria-label="Хештеги: Усі теги"');
  });

  it("«без хештегів» теж показано чипом", () => {
    const html = render({ tags: { kind: "untagged" } });

    expect(html).toContain("Без хештегів");
    expect(html).toContain("Показати й нотатки з хештегами");
  });

  it("пошук теж показаний знімним чипом, а не лише полем", () => {
    // Інакше «чому список короткий» доводилось би згадувати, а не бачити.
    const html = render({ query: "риба" });

    expect(html).toContain("wb-tools-chip");
    expect(html).toContain("«риба»");
    expect(html).toContain("Прибрати пошук «риба»");
  });

  it("пошук у спокої вузький і розкривається на запит", () => {
    // Порожнє поле на всю ширину — це місце, відібране у трьох клітинок, за
    // якими людина приходить у цю смугу.
    const collapsed = render();
    expect(collapsed).toContain('placeholder="Пошук"');
    expect(collapsed).not.toContain("wb-tools-search--open");

    // Що є запит — поле вже розкрите: згорнути набране було б втратою з очей.
    expect(render({ query: "риба" })).toContain("wb-tools-search--open");
  });

  it("пошук і три клітинки стоять в ОДНОМУ ряду, пошук — першим", () => {
    const html = render();

    const bar = html.indexOf('class="wb-tools-bar"');
    expect(bar).toBeGreaterThan(-1);
    // Пошук ліворуч, клітинки праворуч — і обидва в тій самій смузі, а не
    // окремими рядами.
    expect(html.indexOf("wb-tools-search")).toBeGreaterThan(bar);
    expect(html.indexOf("wb-tools-search")).toBeLessThan(html.indexOf("wb-tools-controls"));
  });

  it("клітинки стоять у смузі з пошуком, а чипи — своїм рядом під нею", () => {
    // Чипи — не клітинки керування, а те, що ці клітинки змінили, тож у смузі
    // їм місця немає: там пошук і клітинки.
    const html = render({ sort: "alpha", groupBy: "none" }, { shown: 1, total: 3 });

    const bar = html.indexOf('class="wb-tools-bar"');
    const controls = html.indexOf('class="wb-tools-controls"');
    const chips = html.indexOf('class="wb-tools-chips"');
    expect(bar).toBeGreaterThan(-1);
    expect(controls).toBeGreaterThan(bar);
    expect(chips).toBeGreaterThan(controls);

    // У смузі — рівно п'ять клітинок і нічого більше: від клітинок до чипів
    // закриваються рівно дві обгортки (самі клітинки й смуга), тобто чипи
    // стоять ПІСЛЯ смуги, а не всередині неї.
    expect(toolIcons(html.slice(bar, chips))).toHaveLength(3);
    expect(html.slice(bar, chips)).toContain("wb-collection-tool");
    expect(html.slice(bar, chips)).toContain("wb-tools-btn--toggle");
    expect((html.slice(controls, chips).match(/<\/div>/g) ?? []).length).toBe(2);

    // Чипи — після смуги, і підпис вибраного в них.
    expect(html.slice(chips)).toContain("За абеткою");
  });

  it("запит прибирається ✕ у полі, а не лише чипом", () => {
    const html = render({ query: "риба" });

    expect(html).toContain("wb-tools-search-clear");
    expect(html).toContain('aria-label="Прибрати пошук"');
    // Порожнє поле цієї кнопки не має: прибирати нема чого.
    expect(render()).not.toContain("wb-tools-search-clear");
  });

  it("смуга не переноситься — клітинки не стрибають на другий рядок", () => {
    const bar = rule(".wb-tools-bar");

    expect(bar).toContain("display: flex");
    expect(bar).not.toContain("wrap");
    expect(rule(".wb-tools-controls")).not.toContain("wrap");
    // Розкрите поле забирає лише вільне місце, а не рядок цілком.
    expect(rule(".wb-tools-search--open")).toContain("flex: 1 1 auto");
  });

  it("у спокої навколо поля немає нічого, а на фокусі світиться саме поле", () => {
    // Залите поле поруч із трьома клітинками читалось як ще одна кнопка, тож
    // заливка й розмите світло з'являються тільки на дотик — і навколо місця,
    // де пишуть, а не навколо оболонки з іконкою.
    const shell = rule(".wb-tools-search");
    expect(shell).not.toContain("background");

    const inner = rule(".wb-tools-search .wb-input");
    expect(inner).toContain("background: none");
    expect(inner).toContain("box-shadow: none");
    expect(inner).toContain("padding: 0");
    expect(inner).toContain("height: var(--tools-row-h)");

    const focus = rule(".wb-tools-search .wb-input:focus");
    expect(focus).toContain("background: var(--field-bg)");
    expect(focus).toContain("var(--tools-search-glow)");

    expect(rule(".wb-tools-search--open .wb-input")).toContain("width: 100%");
  });

  it("ряд низький: мірка смуги вдвічі менша за планку пальця композера", () => {
    // Високий ряд забирав у списку більше екрана, ніж сам список.
    expect(rule(".wb-tools-bar")).toContain("--tools-row-h: 32px");
    expect(rule(".wb-tools-controls")).toContain("--tools-cell: var(--tools-row-h)");
  });

  it("перемикач «розгорнути / згорнути всі» стоїть у ряду й показує свій стан", () => {
    // Це не вибір, а дія: пікери відкривають поверхню, а цей діє одразу — тож
    // стан мусить бути видно на самій клітинці, без підпису.
    const collapsed = render();
    expect(collapsed).toContain('aria-pressed="false"');
    expect(collapsed).toContain('aria-label="Розгорнути всі нотатки"');
    expect(collapsed).not.toContain("wb-tools-btn--on");

    const expanded = render({}, { shown: 3, total: 3 }, true);
    expect(expanded).toContain('aria-pressed="true"');
    expect(expanded).toContain('aria-label="Згорнути всі нотатки"');
    expect(expanded).toContain("wb-tools-btn--on");
    // Знак теж міняється — з підписом його читає скрінрідер, без підпису око.
    expect(toggleButton(expanded)).not.toBe(toggleButton(collapsed));
  });

  it("вибір вигляду стоїть серед виборів, а перемикач — останнім", () => {
    // Вигляд відкриває ту саму поверхню, що сортування й фільтр, тож він у
    // їхньому ряду; перемикач «розгорнути всі» діє одразу — тому він через
    // просвіт і останній.
    const html = render();
    const lastPicker = html.lastIndexOf('class="wb-tools-btn"');
    const layout = html.indexOf("wb-collection-tool");
    const toggle = html.indexOf("wb-tools-btn--toggle");

    expect(lastPicker).toBeGreaterThan(-1);
    expect(layout).toBeGreaterThan(lastPicker);
    expect(toggle).toBeGreaterThan(layout);
  });

  it("клітинка вигляду називає поточний вибір, а не показує його знаком", () => {
    // Знак у ній один і той самий (як і в трьох виборів поруч): стан показує
    // чип, а ім'я — `aria-label`.
    expect(render()).toContain('aria-label="Відображення: Рядки"');
    expect(render({ layout: "cards", columns: 1 })).toContain(
      'aria-label="Відображення: Картки — 1 колонка"',
    );
    // Клопіт смуги не росте: клітинка вигляду не додає собі підпису чи заливки.
    expect(toolIcons(render({ layout: "cards", columns: 2 }))).toHaveLength(3);
  });

  it("плитки — це вибір, тож у списку вони стоять знімним чипом", () => {
    // Типове (рядки) чипа не має: постійний чип «Рядки» говорив би те, що й
    // так видно зі списку.
    expect(chipLabels(render())).not.toContain("Рядки");

    const html = render({ layout: "cards", columns: 1 });
    expect(chipLabels(html)).toContain("Картки · 1");
    expect(html).toContain("Повернути звичайний список (Рядки)");
  });

  it("спільна клітинка бере мірку ряду: контроли однієї висоти", () => {
    expect(rule(".wb-tools-controls")).toContain("--cell: var(--tools-cell)");
  });

  it("стан перемикача видно акцентом — тим самим маркером, що в сайдбарі", () => {
    // Плишку (заливку `--accent-dim`) знято: «обране» в продукті показують
    // акцентний колір, вага й товщий штрих знака (DESIGN_SYSTEM.md, правило 25)
    // — так само, як пункт сайдбара та пункт футера.
    expect(rule(".wb-tools-btn--on")).toContain("color: var(--accent)");
    expect(rule(".wb-tools-btn--on"), "перемикач не заливають").not.toContain("accent-dim");
  });

  it("шапка сторінки зі смугою лишаються на видноті при прокрутці", () => {
    // Список нотаток довгий: без цього заголовок, пошук і кнопки зникали після
    // першого ж екрана — тобто рівно тоді, коли вони й потрібні. Тло мусить
    // бути непрозорим: під смугою їде вміст.
    const sticky = chrome(".wb-page-sticky");

    expect(sticky).toContain("position: sticky");
    expect(sticky).toContain("top: 0");
    expect(sticky).toContain("background: var(--bg-page");
    // А проміжки смуги в цьому шарі задає сам шар, а не вони обидва
    // (`components.css` — бо `.wb-tools` це кирпичик нотаток).
    expect(rule(".wb-page-sticky .wb-tools")).toContain("margin-bottom: 0");
  });

  it("кількість показаних нотаток видно лише тоді, коли вона менша за всі", () => {
    expect(render()).not.toContain("wb-tools-summary");
    expect(render({ query: "риба" }, { shown: 1, total: 3 })).toContain("wb-tools-summary");
  });
});
