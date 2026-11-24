/**
 * Сторож хрому: **футер, слот дії й мірки, які рахують UI клієнта**.
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
 * **Мірки хрому рахують UI клієнта.** У повноекранному режимі клієнт шапки не
 * малює, зате «закрити» й «меню» стоять ПОВЕРХ застосунку — без їх місця в
 * `--safe-*` наш хедер стояв би під ними, і це видно лише на телефоні.
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
    // Висота смуги — `--tab-bar-h` і safe-area, а не сума мірок знака.
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

  it("дія списку — акцентне коло в ряду клітинок, а не окрема кнопка", () => {
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
 * Дошка оголошень тут більше не перевіряється: її рядок — окрема деталь, і
 * правила його живуть у `styles/ads.css`. Сторожі переїхали туди —
 * `pages/AdsBoard.test.tsx`, «оголошення — рядок, який відкривається».
 */

/**
 * Назва екрана на телефоні.
 *
 * Назву дає вміст (назва рядка `scenarios`), тож її довжину ніхто не
 * обмежує. У хедері вона стоїть одним рядком і не переноситься — довга
 * обрізається трикрапкою, щоб не розтягувати другий рядок.
 */
/**
 * Висота хедера: від неї відлічують закріплені речі сторінки — шапка таблиці
 * стає під хедером через `top`. Число з CSS її не задає: `min-height` —
 * підлога, а два рядки хедера на збільшеному шрифті роблять його вищим за
 * `--topbar-h`. Тож токен — початкове значення, а справжню висоту хедер
 * публікує сам (див. `useAppBarHeight.dom.test.ts`).
 */
describe("висота хедера", () => {
  it("`--appbar-h` — початкове значення, і хедер обох оболонок тримає саме його", () => {
    const tokens = readFileSync(join(REPO_ROOT, "packages/shared/src/styles/tokens.css"), "utf8");
    expect(tokens).toContain("--appbar-h: calc(var(--topbar-h) + var(--safe-top) + var(--sp-2))");
    expect(rule(".wb-appbar")?.body).toContain("min-height: var(--appbar-h)");
    expect(rule(".wb-app-header")?.body).toContain("height: var(--appbar-h)");
  });
});

/**
 * Вставки під UI клієнта: у повноекранному режимі клієнт шапки не малює, зате
 * «закрити» й «меню» стоять ПОВЕРХ застосунку (див. `docs/PLATFORM.md`).
 */
describe("мобільні вставки враховують UI клієнта", () => {
  {
    const file = "tokens.css";
    it(`${file}: у \`--safe-*\` входить місце під кнопками клієнта`, () => {
      const css = readFileSync(join(REPO_ROOT, `packages/shared/src/styles/${file}`), "utf8");

      expect(css).toMatch(
        /--safe-top:\s*max\([\s\S]*?--tg-content-safe-area-inset-top, 0px[\s\S]*?\);/,
      );
      expect(css).toMatch(
        /--safe-bottom:\s*max\([\s\S]*?--tg-content-safe-area-inset-bottom, 0px[\s\S]*?\);/,
      );
    });
  }
});

describe("рядок хлібного шляху", () => {
  it("бренду в хедері немає, а шлях — один рядок із трикрапкою", () => {
    // Ім'я продукту стоїть у рідній шапці Telegram: друге «ПАЛЯНИЦЯ» в хедері
    // було б тією самою назвою двічі. Шлях не росте з глибиною.
    expect(CHROME.some((entry) => entry.selector === ".wb-appbar__brand-sub")).toBe(false);
    expect(CHROME.some((entry) => entry.selector === ".wb-appbar__brand-name")).toBe(false);

    const trail = rule(".wb-appbar__trail");
    const crumb = rule(".wb-appbar__crumb");
    expect(trail, "рядок шляху мусить мати правило").toBeDefined();
    expect(crumb, "рівень шляху мусить мати правило").toBeDefined();
    expect(trail?.body).toContain("display: flex");
    expect(trail?.body).toContain("overflow: hidden");
    expect(crumb?.body).toContain("white-space: nowrap");
    expect(crumb?.body).toContain("text-overflow: ellipsis");
    expect(crumb?.body).toContain("font-size: var(--text-md)");

    // Крохи — підпис шляху, а не заголовок: жодне накреслення не жирне.
    expect(crumb?.body).toContain("font-weight: var(--weight-regular)");
    const current = rule(".wb-appbar__crumb--current");
    expect(current?.body).not.toContain("var(--weight-bold)");
    expect(CHROME.some((entry) => entry.selector.includes(":first-child:not(:last-child)"))).toBe(
      false,
    );

    // Шлях стоїть у хедері завжди — жодного hero-стану, який його ховає.
    expect(CHROME.some((entry) => entry.selector === ".wb-appbar--hero")).toBe(false);
    expect(CHROME.some((entry) => entry.selector === ".wb-appbar__trail--floating")).toBe(false);
    expect(CHROME.some((entry) => entry.selector === ".wb-appbar--compact")).toBe(false);
  });
});

/**
 * Шапка екрана — **тон розділу**, а не колір теми: нативна шапка клієнта, наш
 * хедер і верхівка графіки мусять бути однією поверхнею. Ламається мовчки:
 * досить повернути `--chrome-header-bg` у `.wb-appbar` — і під шапкою з'явиться
 * світла смуга іншого кольору, а клієнт малюватиме шапку не тим тоном.
 */
describe("шапка екрана — тон розділу", () => {
  const PLATFORM = rulesOf("packages/shared/src/styles/platform.css");

  it("хедер фарбується фактичним кольором шапки клієнта, тон — запасний", () => {
    // `--chrome-appbar-bg` публікує `telegram-chrome`: тон розділу або власний
    // колір клієнта (якщо він тон не взяв). Токен розділу — лише як запасний.
    const body = rule(".wb-appbar")?.body ?? "";
    expect(body).toContain("var(--chrome-appbar-bg");
    expect(body).toContain("var(--chrome-section-bg");
  });

  it("верхівка: одна висота, акцент на все фото, колір шапки — на шві", () => {
    // Висота одна для всіх сторінок: 52% екрана, без «рівневих» варіантів.
    const head = PLATFORM.find((entry) => entry.selector === ".wb-screen-head")?.body ?? "";
    expect(head).toContain("52dvh");
    expect(PLATFORM.some((entry) => entry.selector.startsWith('.wb-screen[data-depth="'))).toBe(
      false,
    );
    // Акцент екрана (= колір шапки клієнта) фарбує **все** фото, а не смугу:
    // простий напівпрозорий шар, без `mix-blend-mode` — його не тягне WebView.
    const tint = PLATFORM.find((entry) => entry.selector === ".wb-screen-head::after")?.body ?? "";
    expect(tint).toContain("var(--chrome-appbar-bg, var(--chrome-section-bg))");
    expect(tint).toContain("opacity:");
    expect(tint).not.toContain("mix-blend-mode");
    // Рівно колір шапки лишається тільки на шві — верхні відсотки обкладинки.
    const shade = PLATFORM.find((entry) => entry.selector === ".wb-screen-head__shade")?.body ?? "";
    expect(shade).toContain("var(--chrome-appbar-bg");
    // Жодного окремого «верху сторінки» зі своїм градієнтом.
    expect(PLATFORM.some((entry) => entry.selector.startsWith(".wb-screen-cover"))).toBe(false);
  });

  it("кожен розділ має власний тон в обох схемах", () => {
    for (let tone = 1; tone <= 6; tone += 1) {
      const light = PLATFORM.find((entry) => entry.selector === `:root[data-tone="${tone}"]`);
      const dark = PLATFORM.find(
        (entry) => entry.selector === `:root[data-theme="dark"][data-tone="${tone}"]`,
      );
      // Плоский hex, а не `var()`: саме його приймає `setHeaderColor`.
      expect(light?.body, `тон ${tone}`).toMatch(/--chrome-section-bg: #[0-9a-f]{6};/);
      expect(dark?.body, `темний тон ${tone}`).toMatch(/--chrome-section-bg: #[0-9a-f]{6};/);
    }
  });
});
