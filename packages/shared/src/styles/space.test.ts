/**
 * Сторож списку Простору: **один вигляд на всі розділи** — рядок без заливки,
 * повітря замість межі, шеврон як ознака переходу, — і тумблера панелі, який
 * стоїть у шапці сторінки, поруч із назвою.
 *
 * Чому це тест, а не коментар. Кожна з цих речей ламається мовчки: заливка
 * повертається в один із чотирьох списків (її дає кирпичик, а не розмітка — і
 * зникає вона саме тому, що її додали іншому кирпичикові), шеврон з'являється
 * на рядку, який нікуди не веде (це вже обіцянка, а не оформлення, §7), а
 * картка теми знову стає карткою **про** тему замість прев'ю — і тоді смуга зі
 * зразків повертається як «єдиний спосіб показати кольори».
 *
 * Розбору CSS у тестовому середовищі немає (environment: node, без DOM), тож
 * CSS читається як текст — так само зроблено в `menu.test.ts` і
 * `buttons.test.ts`.
 *
 * @module packages/shared/src/styles/space.test
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

/** CSS без коментарів: правило шукають у коді, а не в прозі про нього. */
function css(path: string): string {
  return source(path).replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Тіла `@media`-блоків — із балансом дужок: правила всередині теж мають `}`,
 * тож простий пошук кінця блоку до першої дужки врізався б у середину.
 */
function mediaBlocks(text: string): string[] {
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

/**
 * CSS без медіазапитів: усередині них правила мають власні дужки, і плоский
 * розбір (як у `menu.test.ts`) зшиває їхні селектори із сусідами. Правила
 * всередині `@media` перевіряються окремо, `mediaBlocks`.
 */
function topLevel(text: string): string {
  let rest = text;
  for (const body of mediaBlocks(text)) rest = rest.replace(body, "");
  return rest.replace(/@media[^{]*\{\s*\}/g, "");
}

const SPACE_RAW = source("packages/shared/src/styles/space.css");
const NAV = css("packages/shared/src/styles/space-nav.css");
const SPACE = topLevel(css("packages/shared/src/styles/space.css"));
const THEME = topLevel(css("packages/shared/src/styles/theme-pages.css"));
const CHROME = topLevel(css("packages/shared/src/styles/components.css"));

interface Rule {
  selector: string;
  body: string;
}

function rules(text: string): Rule[] {
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.replace(/\s+/g, " ").trim(),
    body,
  }));
}

/** Останнє правило для селектора — те, що справді діє при рівній специфічності. */
function rule(text: string, selector: string): Rule | undefined {
  return rules(text)
    .filter((entry) => entry.selector === selector)
    .at(-1);
}

/** Плитки немає: правило мусить і прибрати заливку, і зняти тінь. */
describe("список Простору — рядок без плитки", () => {
  it("заливка й тінь зняті з усіх чотирьох списків, і жодного не забуто", () => {
    const row = rule(
      SPACE,
      ".wb-space-page .wb-ad, .wb-space-page .wb-collection--rows .wb-ad, .wb-space-page .wb-person, .wb-space-page .wb-menu-item",
    );
    expect(row, "правило рядка мусить існувати").toBeDefined();
    expect(row?.body).toContain("background: none");
    expect(row?.body).toContain("box-shadow: none");
    // Відступ існував, щоб текст не впирався в край плитки: без плитки він стає
    // зсувом — знак мусить стояти на лінії заголовка розділу.
    expect(row?.body).toContain("padding: 0");
  });

  it("рядки розділяє повітря, а не лінія", () => {
    const gap = rule(
      SPACE,
      ".wb-space-page .wb-people, .wb-space-page .wb-menu-list, .wb-space-page .wb-collection",
    );
    expect(gap, "правило повітря між рядками мусить існувати").toBeDefined();
    expect(gap?.body).toContain("gap: var(--sp-4)");
    // Межі між рядками немає: правило 15 — розділювач це не лінія. Перевіряємо
    // саме рядок (у тумблера `border: none` — це скасування рамки кнопки).
    const row = rule(
      SPACE,
      ".wb-space-page .wb-ad, .wb-space-page .wb-collection--rows .wb-ad, .wb-space-page .wb-person, .wb-space-page .wb-menu-item",
    );
    expect(row?.body).not.toContain("border");
  });

  it("дотик у списку видно — на телефоні hover немає", () => {
    expect(rule(SPACE, ".wb-space-page .wb-menu-item:active")?.body).toContain(
      "background: var(--surface-active)",
    );
  });
});

describe("шеврон — ознака переходу", () => {
  it("кирпичик шеврона приглушений, а не акцентний", () => {
    // Акцент у списку означає «тут ти» (правило 15): другий акцентний знак
    // читався б як другий стан.
    expect(CHROME).toContain(".wb-menu-item-more {");
    const more = rule(CHROME, ".wb-menu-item-more");
    expect(more?.body).toContain("color: var(--text-muted)");
    expect(more?.body).not.toContain("--accent");
  });

  it("шеврон рендерить спільний рядок — за ознакою `trailing`, а не за списком", () => {
    const list = source("packages/ui/src/menu/MenuList.tsx");
    expect(list).toContain("item.trailing");
    expect(list).toContain("wb-menu-item-more");
    // Галочка і шеврон — про різне (стан проти напрямку), тож і знаки різні.
    expect(list).toContain("wb-menu-item-check");
  });

  it("ігри й сторінки ведуть далі, тож шеврон у них є — і тим самим кирпичиком", () => {
    expect(source("web-platform-dev/src/pages/games/SpaceGamesTab.tsx")).toContain(
      "trailing: true",
    );
    expect(source("web-platform-dev/src/pages/user-pages/SpacePagesTab.tsx")).toContain(
      "wb-menu-item-more",
    );
  });
});

describe("картка теми — прев'ю теми", () => {
  it("тло, текст і акцент картки беруться з самої теми", () => {
    const card = rule(THEME, ".wb-theme-scheme");
    expect(card, "правило картки мусить існувати").toBeDefined();
    expect(card?.body).toContain("background: var(--scheme-bg)");
    expect(card?.body).toContain("color: var(--scheme-text)");
    // Край — з кольору теми: прев'ю мусить мати межу й тоді, коли його фон
    // збігається з площиною екрана, але це не наша лінія (правило 15).
    expect(card?.body).toContain("color-mix(in srgb, var(--scheme-text)");
  });

  it("змінні ставить картка, і жодного кольору в розмітці немає", () => {
    const component = source("web-platform-dev/src/pages/themes/SchemeCard.tsx");
    for (const name of ["--scheme-bg", "--scheme-text", "--scheme-accent", "--scheme-on-accent"]) {
      expect(component, name).toContain(name);
    }
    // Підпис на акценті — та сама функція, що дає `--user-on-accent` живим
    // кольорам: інакше на світлому акценті він зливався б із кнопкою.
    expect(component).toContain("onAccentColor");
    expect(component).not.toMatch(/style=\{\{ background: "#/);
  });

  it("смуги зі зразків більше немає — картка і є зразок", () => {
    // Саме ця смуга робила картку високою й неінформативною: кольори було
    // видно, а вигляд теми доводилось уявляти.
    expect(THEME).not.toContain(".wb-theme-scheme-preview");
    expect(source("web-platform-dev/src/pages/themes/SchemeCard.tsx")).not.toContain(
      "wb-theme-scheme-preview",
    );
  });

  it("кнопки й чипи картки говорять кольорами теми", () => {
    // `!important` обов'язковий: бренд задає кольори кнопки з ним, і без нього
    // кнопка прев'ю ставала б акцентом застосунку — тобто чужим кольором.
    const primary = rule(THEME, "html[data-brand] .wb-theme-scheme .wb-btn-primary");
    expect(primary, "правило кнопки прев'ю мусить існувати").toBeDefined();
    expect(primary?.body).toContain("background: var(--scheme-accent) !important");
    expect(primary?.body).toContain("color: var(--scheme-on-accent) !important");
  });
});

describe("шапка сторінки — та сама сітка, що вміст", () => {
  it("у панелі своєї шапки немає", () => {
    // Слово «Розділи» повторювало те, що видно зі знаків, а рядок забирало
    // справжнє — перший пункт списку має вищу ціну, ніж підпис над ним.
    const nav = source("web-platform-dev/src/pages/SpaceNav.tsx");
    expect(nav).not.toContain("wb-nav-header");
    expect(nav).not.toContain("wb-nav-toggle");
  });

  it("шапка повторює колонки розкладки — тумблер у смузі, назва на лінії вмісту", () => {
    // Це не косметика, а причина: тумблер зі своїм тапом ширший за знак, і
    // коли він розсуває заголовок, назва з'їжджає з лінії списку (так і було:
    // заголовок стояв на 32px правіше за все, що під ним).
    const head = rule(SPACE, ".wb-space-head");
    expect(head, "правило шапки мусить існувати").toBeDefined();
    expect(head?.body).toContain("display: grid");
    expect(head?.body).toContain("grid-template-columns: var(--space-rail) minmax(0, 1fr)");
    // Проміжок — як у розкладки: інакше назва з'їде рівно на різницю.
    expect(head?.body).toContain("gap: var(--sp-3)");
    // Проміжок — **один на всі ширини**: свого `gap` у шапки на телефоні
    // немає, бо лінія вмісту не має переїжджати разом із шириною екрана —
    // інакше заголовок сходиться зі списком лише на одній із двох ширини.
    expect(mediaBlocks(SPACE_RAW).some((body) => /\.wb-space-head\s*\{/.test(body))).toBe(false);
  });

  it("ширину смуги знає один токен — його читає і панель", () => {
    // Друга цифра того самого в двох файлах розійшлася б першою ж правкою.
    expect(rule(SPACE, ".wb-space-page")?.body).toContain("--space-rail: 44px");
    expect(NAV).toContain("width: var(--space-rail, 44px)");
    // 44 + `--sp-3` = 72 — та сама лінія вмісту, що в шапки (див. коментар у
    // `space.css`): смуга — це **тап-таргет**, а не «колонка під знак».
    const layout = rule(NAV, ".wb-space-layout");
    expect(layout?.body).toContain("gap: var(--sp-3)");
    expect(mediaBlocks(NAV).some((body) => /\.wb-space-layout\s*\{/.test(body))).toBe(false);
    // І смуга коротша за екран рівно на шапку — інакше порожня сторінка
    // прокручується на рядок.
    expect(NAV).toContain("var(--space-head, 0px)");
  });

  it("тумблер стоїть у шапці — у міру назви й не вужчий за палець", () => {
    const page = source("web-platform-dev/src/pages/SpacePage.tsx");
    expect(page).toContain("wb-space-head");
    expect(page).toContain("wb-space-toggle");
    expect(page).toContain("nav.toggle");
    // І шапка — до розкладки, а не в правій колонці: інакше її сітка не має як
    // повторити колонки розкладки.
    expect(page.indexOf("wb-space-head")).toBeLessThan(page.indexOf("wb-space-layout"));

    // Міра береться з розміру тексту (`1em`), а не числом: назва й тумблер —
    // один рядок, і третя цифра розійшлася б із `--text-xl` заголовка.
    expect(rule(SPACE, ".wb-space-toggle svg")?.body).toContain("width: 1em");

    const toggle = rule(SPACE, ".wb-space-toggle");
    expect(toggle, "правило тумблера мусить існувати").toBeDefined();
    expect(toggle?.body).toContain("font-size: var(--text-xl)");
    // Ширину дає колонка смуги, висоту — тап-таргет.
    expect(toggle?.body).toContain("width: 100%");
    expect(toggle?.body).toContain("height: 44px");
    // А сам знак — на лівому краї колонки, тобто на березі сторінки: у центрі
    // він шукав би собі пару, якої там немає ні з берегом, ні з лінією вмісту.
    expect(toggle?.body).toContain("place-items: center start");
  });

  it("підписи всіх списків починаються на одній лінії", () => {
    // Знак гри й аватар людини — та сама колонка (`--space-lead`: 48px, бо
    // стільки займає аватар), тож текст обох списків стоїть на одному відступі,
    // а не на 24 і 48.
    expect(rule(SPACE, ".wb-space-page")?.body).toContain("--space-lead: 48px");
    const lead = rule(SPACE, ".wb-space-page .wb-menu-item-icon");
    expect(lead, "правило провідної клітинки мусить існувати").toBeDefined();
    expect(lead?.body).toContain("width: var(--space-lead)");
    expect(lead?.body).toContain("justify-content: flex-start");
  });
});

describe("три лінії екрана — берег, вміст, текст", () => {
  it("текст оголошень стає на лінію тексту, як підписи решти списків", () => {
    // У рядку дошки знак = чип виду (він стоїть на лінії вмісту), а написане —
    // на лінії тексту. Без цього текст дошки читався на 60px лівіше за підписи
    // ігор, і перехід між розділами зсував усе написане на екрані.
    expect(rule(SPACE, ".wb-space-page")?.body).toContain(
      "--space-text: calc(var(--space-lead) + var(--sp-3))",
    );
    const indent = rule(
      SPACE,
      ".wb-space-page .wb-collection--rows .wb-ad-title, .wb-space-page .wb-collection--rows .wb-ad-body",
    );
    expect(indent, "правило відступу тексту дошки мусить існувати").toBeDefined();
    expect(indent?.body).toContain("padding-left: var(--space-text)");
  });

  it("знаки панелі стають на беріг сторінки — в обох станах і на телефоні", () => {
    // Центрований знак смуги стояв **між** берегом і лінією вмісту — ні на
    // одній із них; знаки рядків списку тим часом стояли на своєму лівому краї.
    const item = rule(NAV, "html[data-brand] .wb-space-nav .wb-nav-item");
    expect(item, "правило знака панелі мусить існувати").toBeDefined();
    expect(item?.body).toContain("justify-content: flex-start !important");
    expect(item?.body).toContain("padding-left: 0 !important");
    // Список панелі без власних бічних відступів — інакше знак з'їхав би на
    // 8px кирпичика всередину.
    expect(rule(NAV, ".wb-space-nav .wb-nav-menu")?.body).toContain("padding-left: 0");
    // Розгорнута панель на телефоні лягає від краю екрана (`left: 0`), тож
    // беріг їй задають її ж відступи: знак мусить лишитись там, де він у смузі.
    expect(
      mediaBlocks(NAV).some((body) =>
        /\.wb-space-nav:not\(\.wb-nav--collapsed\)\s*\{[^}]*padding-left: var\(--sp-4\)/.test(body),
      ),
    ).toBe(true);
  });
});

describe("другий рядок — смуга керування розділу", () => {
  it("кожен розділ має смугу — її бракує мовчки", () => {
    // Розділ без смуги не ламає нічого видимо: він лише починає список на
    // рядок вище за решту — і перший знак панели лишається сам відносно нього.
    for (const path of [
      "web-platform-dev/src/pages/SpaceUsersTab.tsx",
      "web-platform-dev/src/pages/SpaceThemesTab.tsx",
      "web-platform-dev/src/pages/games/SpaceGamesTab.tsx",
      "web-platform-dev/src/pages/user-pages/SpacePagesTab.tsx",
    ]) {
      expect(source(path), path).toContain("SpaceListToolbar");
    }
    // Дошка має власну смугу (вид і «чиї»), але це та сама спільна смуга.
    expect(source("web-platform-dev/src/pages/SpaceAdsToolbar.tsx")).toContain("CollectionToolbar");
  });

  it("смуга стоїть **перед** списком — це і є другий рядок екрана", () => {
    const tab = source("web-platform-dev/src/pages/games/SpaceGamesTab.tsx");
    expect(tab.indexOf("<SpaceListToolbar")).toBeLessThan(tab.indexOf("<MenuList"));
    // І списки всіх розділів беруть один клас розкладки: інакше крок між
    // рядками в них розійшовся б (див. `space.css`).
    for (const path of [
      "web-platform-dev/src/pages/SpaceUsersTab.tsx",
      "web-platform-dev/src/pages/user-pages/SpacePagesTab.tsx",
    ]) {
      expect(source(path), path).toContain("SPACE_LIST_CLASS");
    }
  });

  it("вибір вигляду є лише там, де вигляду справді два", () => {
    // Клітинка, яка нічого не міняє, — це обіцянка без дії (правило 7). Двоє
    // виглядів має тільки дошка оголошень, решта розділів беруть самий пошук.
    expect(source("web-platform-dev/src/pages/SpaceListToolbar.tsx")).toContain(
      "showViewSwitch={false}",
    );
    expect(source("web-platform-dev/src/pages/SpaceAdsToolbar.tsx")).not.toContain(
      "showViewSwitch",
    );
  });

  it("смуга, список і примітка стоять одним стовпчиком з одним кроком", () => {
    const panel = rule(SPACE, ".wb-space-page .wb-space-panel");
    expect(panel, "правило панели розділу мусить існувати").toBeDefined();
    expect(panel?.body).toContain("flex-direction: column");
    expect(panel?.body).toContain("gap: var(--sp-4)");
    expect(source("web-platform-dev/src/pages/SpacePage.tsx")).toContain(
      'className="wb-space-panel"',
    );
    // Список тем має свій верхній відступ зі сторінки тем — у розділі він
    // зсунув би картки нижче за решту списків.
    expect(rule(SPACE, ".wb-space-page .wb-theme-schemes")?.body).toContain("margin-top: 0");
  });

  it("перший знак панели стає на лінію першої клітинки смуги", () => {
    // Смуга починається там само, де вміст, тож верхній відступ списку панели
    // з'їжджав би знаки на цей відступ — і око бачило б другу лінію.
    expect(rule(NAV, ".wb-space-nav.wb-nav--collapsed .wb-nav-menu")?.body).toContain("padding: 0");
  });

  it("назва екрана — підпис відкритого розділу, а не «Простір» на всіх", () => {
    // Друга копія підпису тут була б третім місцем, яке треба правити при
    // перейменуванні розділу: ім'я беруть зі `space-tabs`.
    const page = source("web-platform-dev/src/pages/SpacePage.tsx");
    expect(page).toContain('nav.named ? nav.current.label : "Простір"');
    expect(source("web-platform-dev/src/pages/useSpaceNav.ts")).toContain("named");
  });
});

describe("список зібраний зі спільних кирпичиків", () => {
  it("правила списку приходять після тих, що малюють кирпичики", () => {
    // Список зводить до одного вигляду класи, які прийшли раніше
    // (`components.css`, `app-chrome.css`, `theme-pages.css`): при однаковій
    // специфічності виграє той, хто йде пізніше.
    const index = source("packages/shared/src/styles/index.css");
    const space = index.indexOf('@import "./space.css"');
    expect(space, "space.css мусить бути в збірці стилів").toBeGreaterThan(0);
    expect(space).toBeGreaterThan(index.indexOf('@import "./components.css"'));
    expect(space).toBeGreaterThan(index.indexOf('@import "./theme-pages.css"'));
    expect(space).toBeGreaterThan(index.indexOf('@import "./app-chrome.css"'));
    expect(index.indexOf('@import "./space-nav.css"')).toBeGreaterThan(space);
  });
});
