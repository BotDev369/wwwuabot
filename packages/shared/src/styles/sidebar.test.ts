/**
 * Сторож сайдбара: **він один**.
 *
 * Сайдбарів у продукті чотири місця (меню адмінки, панель розділів Простору,
 * розділи теми й вибір характеру в них же), і кожне колись мало свою мірку
 * рядка: адмінка — пункт 8×10px із підписом 13px, Простір — `!important`
 * поверх бренда, розділи теми — власний набір `.wb-theme-nav*` із плишкою, а
 * `apple.css` / `android.css` переписували геометрію пункту собі (`padding`
 * 12px 14px проти 12px 16px, `min-height` 44 проти 48). Одну деталь із
 * чотирма копіями мірок око читає як чотири деталі — саме це й сталося.
 *
 * Кожне з цих правил ламається **мовчки**: новий сайдбар рендериться своєю
 * розміткою й виглядає майже так само, а число повертається в бренд одним
 * рядком. Тому тут сторожі, а не коментар.
 *
 * CSS читається як текст: розбору CSS у тестовому середовищі немає
 * (`environment: node`), так само зроблено в `space.test.ts` і `chrome.test.ts`.
 *
 * @module packages/shared/src/styles/sidebar.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

function source(...parts: string[]): string {
  return readFileSync(join(REPO_ROOT, ...parts), "utf8");
}

/**
 * CSS без коментарів: правило шукають у коді, а не в прозі про нього.
 *
 * Розділювачі — рядками, а не регулярним виразом: `/*` і `*&#47;` у ньому треба
 * екранувати, а екранований рядок у тесті читається гірше за три рядки коду.
 */
function stripComments(text: string): string {
  return text
    .split("/*")
    .map((chunk, index) => (index === 0 ? chunk : chunk.slice(chunk.indexOf("*/") + 2)))
    .join("");
}

function css(path: string): string {
  return stripComments(source(path));
}

/** Пари «селектор → тіло» — простим сканером дужок: медіазапитів тут уже немає. */
function rules(text: string): { selector: string; body: string }[] {
  const found: { selector: string; body: string }[] = [];
  let from = 0;

  for (;;) {
    const open = text.indexOf("{", from);
    if (open < 0) return found;

    const selectorStart = text.lastIndexOf("}", open) + 1;
    const close = text.indexOf("}", open);

    found.push({
      selector: text.slice(selectorStart, open).replace(/\s+/g, " ").trim(),
      body: text.slice(open + 1, close < 0 ? text.length : close),
    });

    from = open + 1;
  }
}

/** Тіла `@media`-блоків — із балансом дужок: правила всередині мають власні. */
function mediaBodies(text: string): string[] {
  const bodies: string[] = [];
  let from = 0;

  for (;;) {
    const start = text.indexOf("@media", from);
    if (start < 0) return bodies;

    const open = text.indexOf("{", start);
    let depth = 0;
    let end = text.length;

    for (let i = open; i < text.length; i += 1) {
      if (text[i] === "{") depth += 1;
      else if (text[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    bodies.push(text.slice(open + 1, end));
    from = end + 1;
  }
}

/** CSS без медіазапитів: інакше сканер дужок зшиває їхні селектори із сусідами. */
function topLevel(text: string): string {
  let rest = text;
  for (const body of mediaBodies(text)) rest = rest.replace(body, "");
  return rest;
}

/** Останнє правило для селектора — те, що справді діє при рівній специфічності. */
function rule(text: string, selector: string): { selector: string; body: string } | undefined {
  return rules(text)
    .filter((entry) => entry.selector === selector)
    .at(-1);
}

const SHEET = (name: string): string => `packages/shared/src/styles/${name}`;

const TOKENS = topLevel(css(SHEET("tokens.css")));
const NAV = topLevel(css(SHEET("app-chrome.css")));
const SPACE_NAV = topLevel(css(SHEET("space-nav.css")));
const THEME_PAGES = topLevel(css(SHEET("theme-pages.css")));
const BRANDS = ["apple.css", "android.css"].map((name) => css(SHEET(name)));

/** Місця, де сайдбар є в продукті, і файл, який його рендерить. */
const SITES = [
  "web-admin-dev/src/layout/Sidebar/Sidebar.tsx",
  "web-admin-dev/src/layout/Sidebar/SidebarNav.tsx",
  "web-platform-dev/src/pages/SpaceNav.tsx",
  "web-platform-dev/src/pages/themes/ThemeHubPage.tsx",
  "web-platform-dev/src/pages/themes/ThemeStylePage.tsx",
];

describe("сайдбар один — і мірки в нього одні", () => {
  it("крок пункту оголошено **раз** — у токенах, а не в кожному місці", () => {
    // Друга копія цього числа вже розводила панель Простору й смугу
    // керування: обидві брали «44px», але кожна зі свого файлу.
    expect(rule(TOKENS, ":root")?.body).toContain("--sidebar-item-h: 44px");
    expect(rule(TOKENS, ":root")?.body).toContain("--sidebar-pad: var(--sp-2)");

    for (const file of ["app-chrome.css", "space-nav.css", "space.css", "theme-pages.css"]) {
      // Читати можна (`var(--sidebar-item-h)`), оголошувати — ні.
      expect(css(SHEET(file)), file).not.toMatch(/--sidebar-item-h\s*:/);
    }
    for (const brand of BRANDS) {
      expect(brand).not.toContain("--sidebar-item-h");
      expect(brand).not.toContain("--sidebar-pad");
    }
  });

  it("кирпичик пункту бере міру з токена: без свого числа й без `!important`", () => {
    const item = rule(NAV, ".wb-nav-item");
    expect(item, "правило пункту мусить існувати").toBeDefined();
    expect(item?.body).toContain("min-height: var(--sidebar-item-h)");
    expect(item?.body).toContain("padding: 0 var(--sidebar-pad)");
    // Берег пункту й берег списку — та сама цифра: разом 16px, лінія вмісту.
    expect(rule(NAV, ".wb-nav-menu")?.body).toContain("padding: var(--sidebar-pad)");
    // `!important` у сайдбарі означає, що хтось ще пише ті самі мірки.
    expect(SPACE_NAV).not.toContain("!important");
  });

  it("«тут ти» — акцент, а не характер бренду", () => {
    // Футер, меню й панель мусять позначати поточне місце однаково: два різні
    // знаки «тут ти» на одному екрані читались би як два різні стани.
    const active = rule(NAV, ".wb-nav-item--active");
    expect(active?.body).toContain("background: var(--accent-dim)");
    expect(active?.body).toContain("color: var(--accent)");
    for (const brand of BRANDS) {
      expect(brand).not.toContain(".wb-nav-item {");
      expect(brand).not.toContain(".wb-nav-item--active");
    }
  });

  it("згорнутий сайдбар — **відсутність підпису**, а не друга геометрія", () => {
    // Знак лишається на своєму місці (у колонці пункту), тож згортання не
    // зсуває його ні на піксель; ім'я пункту при цьому не губиться — воно в
    // `title` і `aria-label` (див. компонент).
    const collapsed = rule(NAV, ".wb-nav--collapsed .wb-nav-item");
    expect(collapsed?.body).toContain("padding: 0");
    const component = source("packages/ui/src/nav/Sidebar.tsx");
    expect(component).toContain("!collapsed &&");
    expect(component).toContain("wb-nav-label");
    expect(component).toContain("wb-nav-icon");
    // І друга ширина смуги — токен, а не число в компоненті.
    expect(NAV).toContain("width: var(--sidebar-w-collapsed)");
  });
});

describe("сайдбари рендерить один компонент", () => {
  it("усі місця беруть `SideBar` / `SideBarMenu` зі спільного пакета", () => {
    for (const path of SITES) {
      const file = source(...path.split("/"));
      expect(file, path).toContain("@wwwuabot/ui/nav");
      expect(file, path).toContain("SideBar");
    }
    // Панель Простору й хаб теми зводять свою розмітку **до даних**: склад
    // пунктів, а не знаки й підписи вручну.
    expect(source("web-platform-dev/src/pages/SpaceNav.tsx")).toContain("SPACE_TABS");
    expect(source("web-platform-dev/src/pages/themes/ThemeHubPage.tsx")).toContain(
      "THEME_SECTIONS",
    );
  });

  it("другого вигляду рядка не існує — власні класи розділів теми зняті", () => {
    // `.wb-theme-nav*` був сайдбаром-двійником: свої мірки (рядок 64px, плишка
    // `--field-bg`, підпис 18px) і свій знак акцентом. Доки він існує, «єдиний
    // сайдбар» — це побажання, а не факт.
    expect(THEME_PAGES).not.toContain("wb-theme-nav");
    for (const path of SITES) {
      expect(source(...path.split("/")), path).not.toContain("wb-theme-nav");
    }
    // Зразки кольору в другому рядку лишились — але як **частина пункту**
    // сайдбара, а не як власний набір класів.
    expect(NAV).toContain("wb-nav-dots");
    expect(rule(NAV, ".wb-nav-hint")?.body).toContain("color: var(--text-muted)");
  });

  it("пункт уміє стан і перехід — ними користується будь-який сайдбар", () => {
    // Другий рядок («стан») і шеврон («за пунктом екран») були тільки в
    // розділів теми: там для них існував окремий набір класів. Тепер це
    // властивість пункту.
    expect(rule(NAV, ".wb-nav-text")?.body).toContain("flex-direction: column");
    expect(rule(NAV, ".wb-nav-more")?.body).toContain("color: var(--text-muted)");
    // Шеврон — приглушений: акцент у пункті означає «тут ти».
    expect(rule(NAV, ".wb-nav-more")?.body).not.toContain("--accent");
    // Доступність: пункт без підпису називає себе сам (згорнутий сайдбар).
    const component = source("packages/ui/src/nav/Sidebar.tsx");
    expect(component).toContain("aria-label");
    expect(component).toContain("aria-current");
    expect(component).toContain("aria-selected");
  });
});

describe("сайдбар-поверхня: ширина, кут і вихід", () => {
  it("ширина — **частка екрана** і **одна** на всі місця", () => {
    // На телефоні сайдбар виїжджає поверх вмісту, тож його ширина читається від
    // екрана, а не від бренду. Доти кожне місце брало своє (меню адмінки 280px,
    // панель Простору `min(260px, 78vw)`), і той самий сайдбар на тому самому
    // екрані був двічі різний.
    expect(rule(TOKENS, ":root")?.body).toContain("--sidebar-w-vw: 80vw");
    expect(TOKENS.match(/--sidebar-w-vw\s*:/g)?.length, "оголошень мусить бути одне").toBe(1);

    for (const name of ["drawer.css", "space-nav.css"]) {
      expect(css(SHEET(name)), name).toContain("width: var(--sidebar-w-vw)");
      // Свого числа під ту саму ширину більше не існує — ні піксельного, ні
      // відсоткового (друга копія й розводила два сайдбари).
      expect(css(SHEET(name)), name).not.toContain("--drawer-w");
      expect(css(SHEET(name)), name).not.toMatch(/\d+vw/);
    }
  });

  it("заокруглення в сайдбара немає — ні в потоці, ні поверхнею", () => {
    // Сайдбар — **площина екрана**, а не картка на ньому: скруглений кут читався
    // як чужий шматок поверхні, приклеєний до берега.
    expect(rule(NAV, ".wb-nav")?.body).not.toContain("border-radius");

    // Коробки `.wb-space-nav` — дві (місце в потоці й поверхня на телефоні),
    // тож питаємо **обидві**: радіус повертається саме в другу.
    const boxes = rules(SPACE_NAV).filter((entry) => entry.selector === ".wb-space-nav");
    expect(boxes.length, "коробки панелі мусять існувати").toBeGreaterThan(0);
    for (const box of boxes) expect(box.body).not.toContain("border-radius: var(");
    for (const body of mediaBodies(css(SHEET("space-nav.css")))) {
      expect(body, "кут не позичають у бренду").not.toContain("border-radius: var(--radius");
    }
  });

  it("кожен сайдбар-поверхня закриває себе сам — кнопкою в собі", () => {
    // Сайдбар лягає **поверх шапки сторінки**, тож тумблер згортання лишається
    // під ним: без своєї кнопки панель закривав би лише дотик повз неї.
    const row = rule(NAV, ".wb-nav-close-row");
    expect(row, "рядок кнопки мусить існувати").toBeDefined();
    expect(row?.body).toContain("display: none");
    // Берег — той самий, що в пункту: знак кнопки стає на лінію тексту пунктів.
    expect(row?.body).toContain("padding: var(--sp-2) var(--sidebar-pad) 0");
    expect(
      mediaBodies(css(SHEET("app-chrome.css"))).some(
        (body) => body.includes(".wb-nav-close-row") && body.includes("display: flex"),
      ),
      "кнопка видна там, де сайдбар — поверхня",
    ).toBe(true);

    // Кнопка — **спільна**: круглий хрестик продукту (`.wb-close-btn`, як у
    // модалок), а не своя кнопка сайдбара: свій клас тут означав би свій
    // вигляд виходу в кожному місці.
    const component = source("packages/ui/src/nav/Sidebar.tsx");
    expect(component).toContain('className="wb-close-btn"');
    expect(component).toContain('aria-label="Закрити меню"');
    expect(component).toContain('<Icon name="x"');

    // І дію їй передають **обидва** місця, де сайдбар — поверхня: меню адмінки
    // та панель Простору. Третє таке місце (сайдбар конструктора) має свою
    // кнопку в `PageRenderer` — `page-sidebar-close`.
    for (const path of [SITES[0], SITES[2]]) {
      expect(source(...path.split("/")), path).toContain("onClose");
    }
  });
});
