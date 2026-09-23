/**
 * Сторож хрому: **футер, слот дії й бренд, який не переписує роль поверхні**.
 *
 * Два різні дефекти живуть тут поруч, і обидва ламаються мовчки.
 *
 * **Слот дії у футері.** Він займає ту саму п'яту частину смуги, що й вкладка, а
 * підпису не має — тож його виділяє **місце** (центр) і трохи товщий штрих, а не
 * тло й не колір. І тло (залите коло чи плитка), і акцент робили зі слота другу
 * найважчу пляму футера поруч із вибраним розділом — а в смузі акцент означає
 * «тут ти», тобто рівно один пункт. Ламається це мовчки: один `background` чи
 * `color: var(--accent)` у правилі про знак — і смуга повертається до вигляду,
 * від якого її відмовили.
 *
 * **Бренд проти ролі поверхні.** `apple.css` і `android.css` малюють модалку
 * своїм характером — пілюля, M3, темна плівка — і роблять це через
 * `!important`. Поки поверхня була тільки плаваючим аркушем, це було безпечно;
 * але в повноекранної (`--screen`) оверлей і є сторінка, і брендовий радіус
 * показував кути, яких у сторінки немає, а плівка зі склом малювала навколо неї
 * чорні плями. Тому кожне брендове правило про сам ящик мусить явно виключати
 * `--screen` — це та сама помилка, що була з мірками кнопки (див.
 * `buttons.test.ts`), і ловиться вона лише тут.
 *
 * CSS читається як текст: розбору CSS у тестовому середовищі немає
 * (`environment: node`), так само зроблено в `menu.test.ts` і `buttons.test.ts`.
 *
 * @module packages/shared/src/styles/chrome.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

interface Rule {
  selector: string;
  body: string;
}

/** Правила файлу — без коментарів: у них і селектори, і `!important` як розповідь. */
function rulesOf(file: string): Rule[] {
  const css = readFileSync(join(REPO_ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.replace(/\s+/g, " ").trim(),
    body,
  }));
}

const CHROME = rulesOf("packages/shared/src/styles/app-chrome.css");
const COMPONENTS = rulesOf("packages/shared/src/styles/components.css");

/** Останнє правило для селектора — те, що справді діє при рівній специфічності. */
function rule(selector: string): Rule | undefined {
  return CHROME.filter((entry) => entry.selector === selector).at(-1);
}

/** Те саме для спільного шару кирпичиків (`.wb-tools*` живе там). */
function brickRule(selector: string): Rule | undefined {
  return COMPONENTS.filter((entry) => entry.selector === selector).at(-1);
}

describe("футер: знаки без тла", () => {
  /**
   * Правила про **знак** пункту — не про тло самої смуги (воно в неї є, і це
   * хром) і не про підпис. Або тло, або радіус під знаком — це вже плитка, і
   * вона повертає смузі вигляд, від якого її й прибрали.
   */
  const iconRules = CHROME.filter((entry) => entry.selector.includes("wb-tabbar-icon"));

  it("тла під знаками немає — ні в пунктів, ні в слота дії", () => {
    expect(iconRules.length, "правила про знак мусять існувати").toBeGreaterThan(0);
    for (const entry of iconRules) {
      expect(entry.body, entry.selector).not.toContain("background");
      expect(entry.body, entry.selector).not.toContain("border-radius");
    }
  });

  it("акцент у смузі має рівно дві ролі: «тут ти» і «є нове»", () => {
    // «+» видно завжди (він не залежить від адреси), тож його акцент означав би
    // зайву акцентну пляму в кожному стані смуги. Акценту лишаються дві ролі,
    // і обидві — про стан, а не про дію: вибраний розділ і число непрочитаних
    // (число зникає, щойно розмову прочитано, тож на тому самому пункті вони
    // вдвох не стоять). Усе інше акцентним у смузі бути не може.
    const accent = CHROME.filter(
      (entry) => entry.selector.includes("wb-tabbar") && entry.body.includes("var(--accent)"),
    ).map((entry) => entry.selector);
    expect(accent, "правило вибору мусить бути акцентним").toContain(".wb-tabbar-item--active");
    for (const selector of accent) {
      expect([".wb-tabbar-item--active", ".wb-tabbar-badge"], selector).toContain(selector);
    }
    // І сам слот дії більше не має ні тла, ні кольору — тільки штрих.
    expect(rule(".wb-tabbar-item--primary")).toBeUndefined();
    expect(rule(".wb-tabbar-item--primary .wb-tabbar-icon")).toBeUndefined();
  });

  it("число непрочитаних не рухає смугу: воно чіпляється до знака", () => {
    // Смуга має фіксовану висоту, тож позначка стояла б у куті слота, а не там,
    // де на неї дивляться. І вона не може збільшувати пункт.
    const badge = rule(".wb-tabbar-badge");
    expect(badge, "правило позначки мусить існувати").toBeDefined();
    expect(badge?.body).toContain("position: absolute");
    expect(rule(".wb-tabbar-icon")?.body).toContain("position: relative");
  });

  it("вибраний розділ — акцентний підпис і жирніший штрих знака", () => {
    // Це єдине, чим вибір відрізняється від решти, коли тла немає в жодного
    // пункту: колір плюс штрих (і залитий близнюк іконки — `iconActive`).
    const active = rule(".wb-tabbar-item--active");
    expect(active, "правило вибраного пункту мусить існувати").toBeDefined();
    expect(active?.body).toContain("color: var(--accent)");
    expect(rule(".wb-tabbar-item--active .wb-tabbar-icon svg")?.body).toContain("stroke-width");
  });

  it("смуга не росте від знака: мірки задає токен, а не вміст", () => {
    // Висота смуги — `--tab-bar-h` (бренд + safe-area), а не сума мірок знака.
    expect(rule(".wb-tabbar")?.body).toContain("height: var(--tab-bar-h)");
    expect(rule(".wb-tabbar-inner")?.body).toContain("align-items: stretch");
  });
});

/**
 * Каркас сторінки: заголовок, смуга керування списком і сам список — одні
 * відступи на весь продукт. Доти кожен екран додавав свій `margin`, і проміжки
 * розходились: заголовок тулився до смуги, а знизу збігалися два відступи.
 */
describe("каркас сторінки: один проміжок на весь продукт", () => {
  it("шапка сторінки тримає проміжок сама — `gap` і такий самий `padding` знизу", () => {
    const sticky = rule(".wb-page-sticky")?.body ?? "";

    // `gap` — це відступ від заголовка до смуги керування; без нього вони
    // туляться одне до одного (і саме так було).
    expect(sticky).toContain("gap: var(--sp-4)");
    // Той самий крок знизу — і саме `padding` (заливка шару), а не `margin`:
    // поза шаром прогалину видно списком, який крізь неї просвічує.
    expect(sticky).toContain("padding: var(--sp-5) var(--sp-5) var(--sp-4)");
    // Знизу шару — нуль: відступ до списку малює його ж заливка (padding).
    expect(sticky).toContain("calc(var(--sp-5) * -1) calc(var(--sp-5) * -1) 0");
  });

  it("смуга керування не має власних зовнішніх полів", () => {
    // Зовнішні відступи задає каркас: два джерела одного відступу дали б
    // подвійну прогалину під шапкою.
    expect(brickRule(".wb-tools")?.body).not.toContain("margin");
  });

  it("дія списку — акцентне коло в ряду клітинок, а не кнопка бренду", () => {
    const add = rule(".wb-tools-add")?.body ?? "";

    // Мірка ряду: клітинка мусить бути одного зросту із сусідами.
    expect(add).toContain("width: var(--tools-cell)");
    expect(add).toContain("border-radius: var(--radius-full)");
    expect(add).toContain("background: var(--accent)");
    // А в ряду виборів акцент означає дію — і він там рівно один.
    expect(brickRule(".wb-tools-btn")?.body ?? "").not.toContain("accent");
  });
});

/*
 * Дошка оголошень тут більше не перевіряється: її рядок — такий самий рядок
 * списку Простору, як пункт меню чи картка людини, і правила його живуть у
 * `space.css` (разом із рештою рядків). Сторожі переїхали туди —
 * `styles/space.test.ts`, «оголошення — рядок, який відкривається».
 */

/**
 * Бренд має рівно одну роль у модалки: дати **характер** плаваючому аркушу.
 * Повноекранна поверхня — не аркуш, а сторінка, і будь-яке брендове правило
 * про сам ящик мусить її пропускати — інакше `!important` повертає кути й плівку.
 */
describe("бренд не переписує роль повноекранної поверхні", () => {
  /** Селектор цілить у сам ящик (`.wb-modal` / `.wb-modal-overlay`), не в дитину. */
  const boxSelector = /(^|[\s>+~])\.wb-modal(-overlay)?(?=[:.\s]|$)/;

  for (const brand of ["apple", "android"] as const) {
    it(`${brand}: плівка, радіус і тінь — лише для плаваючого аркуша`, () => {
      const box = rulesOf(`packages/shared/src/styles/${brand}.css`).filter((entry) =>
        boxSelector.test(entry.selector),
      );
      // Якщо бренд перестав фарбувати ящик — правило нічого не перевіряє.
      expect(box.length, `${brand}: правил про ящик мусить бути хоч одне`).toBeGreaterThan(0);

      for (const entry of box) {
        const skip = entry.selector.includes("wb-modal-overlay")
          ? ":not(.wb-modal-overlay--screen)"
          : ":not(.wb-modal--screen)";
        expect(entry.selector, `${brand}: ${entry.selector}`).toContain(skip);
      }
    });
  }
});
