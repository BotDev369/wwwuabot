/**
 * Сторож поверхні зі списком: **плитки — по дві в ряду, заглушка не мовчить,
 * а вихід у поверхні один** — і перемикачів: вигляду (`.wb-segmented`,
 * знаками) та розділів сторінки (`.wb-tabs`, підписами, горизонтально).
 *
 * Чому це тест, а не коментар. Кожна з цих речей ламається мовчки: `grid` без
 * `repeat(2, …)` стає одним стовпчиком (розділи знову смуги на всю ширину),
 * приглушена іконка заглушки зрівнює її з робочим пунктом — і око вже не
 * бачить, що з сітки вже працює. А другий вихід (смуга внизу) — це друге місце,
 * де його шукають, і воно вже було: поки `MenuModal` умів і шапку, і смугу.
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

/**
 * Тіла всіх `@media (hover: hover)` — із балансом дужок: правила всередині
 * теж мають `}`, тож простий пошук кінця блоку до першої дужки врізався б у
 * середину (і саме тому медіа-запиту в `RULES` не видно як селектора правил).
 */
function hoverBlocks(): string[] {
  const bodies: string[] = [];
  let from = 0;

  for (;;) {
    const start = CSS.indexOf("@media (hover: hover)", from);
    if (start < 0) return bodies;

    const open = CSS.indexOf("{", start);
    let depth = 0;
    let end = CSS.length;

    for (let i = open; i < CSS.length; i += 1) {
      if (CSS[i] === "{") depth += 1;
      else if (CSS[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    bodies.push(CSS.slice(open + 1, end));
    from = end + 1;
  }
}

describe("меню: плитки й вигляд пункту", () => {
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

  it("розкладка — це `layout`, а не модифікатор на самому пункті", () => {
    // Один набір розмітки й два класи-контейнери: другий набір розійшовся б із
    // першим на першій же правці, а модифікатор на пункті довелося б пам'ятати
    // в кожній розкладці окремо.
    expect(rule(".wb-menu-list")?.body).toContain("flex-direction: column");
    expect(rule(".wb-menu-blocks")?.body).toContain("display: grid");
    expect(rule(".wb-menu-item--rows")).toBeUndefined();
    expect(rule(".wb-menu-block--rows")).toBeUndefined();
  });
});

/**
 * Повноекранна поверхня, перемикач вигляду і **відсутність** смуги внизу.
 *
 * Дві речі тут не косметичні: (1) повноекранна поверхня мусить лишити місце
 * під футером застосунку — інакше її нижня кнопка опиняється ПІД смугою, яку
 * `--z-tabbar` малює над модалкою; (2) сегмент перемикача не менший за палець.
 *
 * Третя — про мертве: смуга внизу (`closePlacement` + `footer`) і притискання
 * вмісту (`align`) лишалися в поверхні тільки тому, що ними колись користувалось
 * меню профілю. Той, хто поверне їх без користувача, поверне й ці рядки — а без
 * них у поверхні один вихід і один прямокутник, і обидва видні в розмітці.
 */
describe("меню: повноекранна поверхня, перемикач і колишня смуга", () => {
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

  it("смуги внизу в поверхні немає — вихід один, у шапці", () => {
    // Смуга жила тут разом із меню профілю: перемикач вигляду і «закрити» під
    // пальцем. Перемикач переїхав у шапку екрана, вихід лишився один — і
    // кирпичики, яких більше ніхто не рендерить, мусять бути видалені, а не
    // лежати «на майбутнє»: мертвий CSS виглядає як робочий і саме тому
    // переживає рефакторинг.
    for (const selector of [
      ".wb-sheet-bar",
      ".wb-sheet-bar > *",
      ".wb-sheet-bar-close",
      ".wb-menu-body--end > :first-child",
      ".wb-modal-title--center",
    ]) {
      expect(rule(selector), selector).toBeUndefined();
    }
  });

  it("сегмент перемикача не менший за палець, і вибраний видно", () => {
    const btn = rule(".wb-segmented-btn");
    expect(btn, "правило .wb-segmented-btn мусить існувати").toBeDefined();
    const minHeight = Number(btn?.body.match(/min-height:\s*(\d+)px/)?.[1]);
    expect(minHeight).toBeGreaterThanOrEqual(44);
    // Знак без підпису мусить лишатись квадратом пальця: ширина — теж 44.
    const minWidth = Number(btn?.body.match(/min-width:\s*(\d+)px/)?.[1]);
    expect(minWidth).toBeGreaterThanOrEqual(44);
    // Підписів у сегменті немає — інакше він з'їдав би місце із заголовком
    // екрана; ім'я варіанта живе в `aria-label`.
    expect(rule(".wb-segmented-label")).toBeUndefined();
  });

  it("дотик не знімає вибір: `:hover` не перебиває вибраний варіант", () => {
    // На тачі `:hover` лишається на останньому торкнутому елементі, а його
    // специфічність вища за `--active` — тож вибраний варіант ставав чорним
    // рівно тоді, коли його щойно вибрали, і перемикач виглядав так, ніби
    // вибір зник. Тому підсвічення наведенням — або під `@media (hover: hover)`,
    // або з `:not(--active)`: на тачі hover не існує.
    expect(CSS).toContain("@media (hover: hover)");
    const hover = RULES.filter((entry) => /:hover/.test(entry.selector));
    const overState = hover.filter((entry) =>
      /(^|[\s,>+~({"])\.wb-segmented-btn(?![\w-])/.test(entry.selector),
    );
    expect(overState.length, "підсвічення мишею мусить існувати").toBeGreaterThan(0);
    for (const entry of overState) {
      expect(entry.selector, entry.selector).toContain(":not(.wb-segmented-btn--active)");
    }
  });

  it("перемикач розділів сторінки — горизонтальний, і розділ не менший за палець", () => {
    // Це інший кирпичик, ніж сегмент вигляду, і різниця не в оформленні:
    // тут обирають **розділ за словом**, а не варіант вигляду за знаком.
    expect(rule(".wb-tabs")?.body).toContain("flex-direction: row");

    const btn = rule(".wb-tabs-btn");
    expect(btn, "правило .wb-tabs-btn мусить існувати").toBeDefined();
    // Половинки ділять рядок **порівну**: `flex: 1 1 0` із `min-width: 0` —
    // інакше довше слово («Платформа») розпирало б свою вкладку, і смуга
    // перестала б бути рівною парою.
    expect(btn?.body).toContain("flex: 1 1 0");
    expect(btn?.body).toContain("min-width: 0");
    const minHeight = Number(btn?.body.match(/min-height:\s*(\d+)px/)?.[1]);
    expect(minHeight).toBeGreaterThanOrEqual(44);
  });

  it("вибраний розділ залитий тим самим акцентом, що й обраний стиль", () => {
    // Інакше вибір в одному продукті мав би два вигляди: обраний «Apple» у
    // панелі теми (`.wb-btn-primary`) і обрана вкладка тут — обидва кажуть
    // «це вибрано», тож і виглядати мусять однаково.
    const active = rule(".wb-tabs-btn--active");
    expect(active, "правило вибраного розділу мусить існувати").toBeDefined();
    expect(active?.body).toContain("background: var(--accent)");
    expect(active?.body).toContain("color: var(--text-inverse)");
  });

  it("дотик не знімає вибір розділу: `:hover` — тільки під `@media (hover: hover)`", () => {
    // Та сама пастка, що в перемикача вигляду: на тачі `:hover` лишається на
    // останньому торкнутому елементі, а його специфічність вища за `--active`.
    const bodies = hoverBlocks();
    expect(bodies.join("\n")).toContain(".wb-tabs-btn:not(.wb-tabs-btn--active):hover");

    let outside = CSS;
    for (const body of bodies) outside = outside.replace(body, "");
    expect(outside).not.toMatch(/\.wb-tabs-btn[^{}]*:hover/);
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
