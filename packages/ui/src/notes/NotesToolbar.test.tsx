/**
 * Смуга керування нотатками — розмітка.
 *
 * Перевіряємо те, що легко зламати мовчки: що вибори стоять **клітинками без
 * підпису й заливки** (та сама клітинка, що у вкладок композера), що вибране
 * **не** пишеться в кнопках, а стоїть поруч знімним чипом, і що типового
 * вибору чипа немає — інакше смуга перетворюється на три «овали», від яких ми
 * й тікали.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не дотики: так само зроблено в `composer/ComposerModal.test.tsx`.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NotesToolbar } from "./NotesToolbar";
import { DEFAULT_NOTES_VIEW, type NotesView } from "./types";

const view = (over: Partial<NotesView> = {}): NotesView => ({ ...DEFAULT_NOTES_VIEW, ...over });

function render(over: Partial<NotesView> = {}, counts = { shown: 3, total: 3 }): string {
  return renderToStaticMarkup(
    <NotesToolbar
      view={view(over)}
      onChange={() => {}}
      tags={["київ", "лал"]}
      shown={counts.shown}
      total={counts.total}
    />,
  );
}

/** Вміст клітинок-іконок: ним і перевіряємо, що знаки справді різні. */
function toolIcons(html: string): string[] {
  return [...html.matchAll(/<button[^>]*class="wb-note-tool"[^>]*>(.*?)<\/button>/g)].map(
    (match) => match[1],
  );
}

/** Підписи чипів: ними й перевіряємо, що кожен вибір знімається окремо. */
function chipLabels(html: string): string[] {
  return [...html.matchAll(/<span class="wb-note-chip-label">(.*?)<\/span>/g)].map(
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

    expect(html).not.toContain("wb-note-chip");
    expect(html).toContain("wb-note-controls");
  });

  it("вибране стоїть поруч знімним чипом із назвою дії", () => {
    const html = render({ sort: "created-desc", tags: { kind: "tags", tags: ["київ"] } });

    expect(html).toContain("wb-note-chip");
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

    expect(html).toContain("wb-note-chip");
    expect(html).toContain("«риба»");
    expect(html).toContain("Прибрати пошук «риба»");
  });

  it("клітинки й чипи стоять в ОДНІЙ смузі, а не в окремих рядах", () => {
    const html = render({ sort: "alpha", groupBy: "none" }, { shown: 1, total: 3 });

    const start = html.indexOf('class="wb-note-controls"');
    const end = html.indexOf("wb-note-summary");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const row = html.slice(start, end);
    expect(toolIcons(row)).toHaveLength(3);
    expect(row).toContain("wb-note-chips");
    expect(row).toContain("За абеткою");
  });

  it("кількість показаних нотаток видно лише тоді, коли вона менша за всі", () => {
    expect(render()).not.toContain("wb-note-summary");
    expect(render({ query: "риба" }, { shown: 1, total: 3 })).toContain("wb-note-summary");
  });
});
