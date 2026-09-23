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
const APP = topLevel(css("packages/shared/src/styles/app-chrome.css"));
const TOKENS = topLevel(css("packages/shared/src/styles/tokens.css"));
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

/**
 * Селектори рядка — **одна сітка на всі списки Простору**. Винесені в сталі
 * навмисно: якщо правило розділиться на два, тест мусить упасти на ньому, а не
 * тихо перевіряти половину.
 *
 * Мітки рядка (плишки, межі, мінімальна висота) справді спільні для всіх
 * трьох; **клітинки — ні** (правило 23): у рядка з обличчям їх три, у рядка
 * контенту — дві. Це і є та половина, яку тест тримає окремо.
 */
const ROW = ".wb-space-page .wb-menu-item, .wb-space-page .wb-person, .wb-space-page .wb-ad-open";
/** Рядки контенту — без провідної клітинки: тільки текст і шеврон. */
const CONTENT_ROW = ".wb-space-page .wb-menu-item, .wb-space-page .wb-ad-open";
/** Єдиний рядок із провідною клітинкою — обличчя людини. */
const FACE_ROW = ".wb-space-page .wb-person";
const GAP =
  ".wb-space-page .wb-people, .wb-space-page .wb-menu-list, .wb-space-page .wb-collection, .wb-space-page .wb-theme-schemes";
const ACTIVE =
  ".wb-space-page .wb-menu-item:active, .wb-space-page .wb-person--tappable:active, .wb-space-page .wb-ad-open:active";
const TITLE =
  ".wb-space-page .wb-menu-item-label, .wb-space-page .wb-person-name, .wb-space-page .wb-ad-title, .wb-space-page .wb-theme-scheme-name";
const HINT =
  ".wb-space-page .wb-menu-item-hint, .wb-space-page .wb-person-about, .wb-space-page .wb-person-facts, .wb-space-page .wb-ad-meta, .wb-space-page .wb-ad-body, .wb-space-page .wb-theme-scheme-meta";

/** Плитки немає, а рядок — один: та сама сітка, та сама мірка, той самий дотик. */
describe("список Простору — один рядок на всі розділи", () => {
  it("рядок — та сама сітка всюди: мітки спільні, клітинки — за вмістом", () => {
    // Мірки рядка одні: без них кожен кирпичик тримав свою сітку, і перехід між
    // розділами рухав усе на екрані.
    const row = rule(SPACE, ROW);
    expect(row, "правило рядка мусить існувати").toBeDefined();
    expect(row?.body).toContain("display: grid");
    expect(row?.body).toContain("min-height: var(--space-row)");
    // Клітинки — окремо: у контенту перед текстом нічого не стоїть, тож їх дві,
    // а провідна колонка (48px, під аватар) лишається списку людей.
    const content = rule(SPACE, CONTENT_ROW);
    expect(content?.body).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(content?.body).toContain('grid-template-areas: "text more"');
    expect(rule(SPACE, FACE_ROW)?.body).toContain(
      "grid-template-columns: var(--space-lead) minmax(0, 1fr) auto",
    );
  });

  it("заливка й тінь зняті з усіх списків, і жодного не забуто", () => {
    const row = rule(SPACE, ROW);
    expect(row?.body).toContain("background: none");
    expect(row?.body).toContain("box-shadow: none");
    // Відступ існував, щоб текст не впирався в край плитки: без плитки він стає
    // зсувом — знак мусить стояти на лінії заголовка розділу.
    expect(row?.body).toContain("padding: 0");
    // Межі між рядками немає: правило 15 — розділювач це не лінія.
    expect(row?.body).toContain("border: none");
  });

  it("рядки розділяє повітря — одне на всі списки", () => {
    const gap = rule(SPACE, GAP);
    expect(gap, "правило повітря між рядками мусить існувати").toBeDefined();
    expect(gap?.body).toContain("gap: var(--sp-4)");
  });

  it("дотик у списку видно — на телефоні hover немає", () => {
    expect(rule(SPACE, ACTIVE)?.body).toContain("background: var(--surface-active)");
  });

  it("мірки тексту — одна на всі розділи", () => {
    // Назва 16px/medium і підпис 14px приглушений — у пункту меню, людини,
    // оголошення й теми. Доти у кожного був свій розмір (16 / 18 / 20), і той
    // самий рядок читався по-різному залежно від розділу.
    expect(rule(SPACE, TITLE)?.body).toContain("font-size: var(--text-base)");
    expect(rule(SPACE, TITLE)?.body).toContain("font-weight: var(--weight-medium)");
    expect(rule(SPACE, HINT)?.body).toContain("font-size: var(--text-sm)");
    expect(rule(SPACE, HINT)?.body).toContain("color: var(--text-muted)");
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
    // Крок пункту сайдбара — **одне число на продукт** (`tokens.css`), і смуга
    // Простору його читає, а не повторює: доки `--space-rail` стояв своїм
    // числом (44px) поруч із кроком пункту панели, правка одного розводила
    // панель і смугу керування — і знаки двох колонок сходились лише з
    // `!important`.
    expect(rule(TOKENS, ":root")?.body).toContain("--sidebar-item-h: 44px");
    expect(rule(SPACE, ".wb-space-page")?.body).toContain("--space-rail: var(--sidebar-item-h)");
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
    // Ширину дає колонка смуги, висоту — **та сама міра, що в пункту панелі**: з
    // різними висотами знаки двох колонок стояли на різній лінії.
    expect(toggle?.body).toContain("width: 100%");
    expect(toggle?.body).toContain("height: var(--space-rail)");
    // А сам знак — на лівому краї колонки, тобто на березі сторінки: у центрі
    // він шукав би собі пару, якої там немає ні з берегом, ні з лінією вмісту.
    expect(toggle?.body).toContain("place-items: center start");
  });

  it("текст контенту стає на лінію вмісту, а людей — на лінію тексту", () => {
    // Провідну колонку (`--space-lead`: 48px, бо стільки займає аватар) тримає
    // лише рядок із **обличчям** — воно вміст, а не знак. Рядки контенту стоять
    // без неї, і їхній текст починається там само, де назва екрана й пошук.
    expect(rule(SPACE, ".wb-space-page")?.body).toContain("--space-lead: 48px");
    expect(rule(SPACE, FACE_ROW)?.body).toContain("var(--space-lead) minmax(0, 1fr) auto");
    expect(rule(SPACE, CONTENT_ROW)?.body).not.toContain("--space-lead");
  });

  it("іконок у контенті Простору немає — ні в рядку, ні в картці (правило 23)", () => {
    // Знак у контенті — третій підпис того самого: назва гри, сторінки чи
    // оголошення називає себе сама, а знак треба ще прочитати. Знак належить
    // **керуванню** (смуга, панель розділів, футер) і обличчю людини.
    expect(SPACE).not.toContain("wb-menu-item-icon");
    expect(SPACE).not.toContain("wb-ad-icon");
    for (const path of [
      "web-platform-dev/src/pages/games/SpaceGamesTab.tsx",
      "web-platform-dev/src/pages/user-pages/SpacePagesTab.tsx",
    ]) {
      const tab = source(path);
      expect(tab, path).not.toContain("wb-menu-item-icon");
      expect(tab, path).not.toContain("pageTemplateIcon");
      expect(tab, path).not.toContain("icon: ");
    }
    // Знак на кнопках лишається: вони керування, а не вміст.
    expect(source("web-platform-dev/src/pages/themes/SchemeCard.tsx")).toContain(
      'className="wb-btn wb-btn-primary wb-btn-sm"',
    );
  });
});

describe("лінії екрана — берег, вміст, текст", () => {
  it("текст рядків не зсувають відступом — його ставить сама сітка", () => {
    // Текст дошки колись зсували окремим `padding-left`, щоб він «став на лінію
    // тексту» — і той самий відступ розводив його з рештою списків. Місце тексту
    // визначає сітка рядка: у списку людей — третя колонка (перед нею обличчя),
    // у контенту — друга, тобто **лінія вмісту**.
    expect(rule(SPACE, ".wb-space-page")?.body).not.toContain("--space-text");
    expect(SPACE).not.toContain("padding-left: var(--space-text)");
    expect(rule(SPACE, CONTENT_ROW)?.body).toContain("grid-template-columns: minmax(0, 1fr) auto");
  });

  it("знаки панелі стають на беріг сторінки — в обох станах і на телефоні", () => {
    // Центрований знак смуги стояв **між** берегом і лінією вмісту — ні на
    // одній із них; знаки рядків списку тим часом стояли на своєму лівому краї.
    //
    // Берег панелі — **нуль** (`--sidebar-pad: 0`): у розкладці сторінки вона й
    // так стоїть із відступом `--sp-4`, тож другий берег усередині зсунув би
    // знак зі спільної лінії. У решти сайдбарів берег дає сам кирпичик
    // (8px списку + 8px пункту = ті самі 16px).
    const item = rule(NAV, ".wb-space-nav .wb-nav-item");
    expect(item, "правило знака панелі мусить існувати").toBeDefined();
    expect(item?.body).toContain("justify-content: flex-start");
    expect(rule(NAV, ".wb-space-nav")?.body).toContain("--sidebar-pad: 0");
    // Список панелі без власних відступів — інакше знак з'їхав би на 8px
    // кирпичика всередину. `!important` тут немає: бренд мірок пункту більше не
    // задає, тож перекривати нічого.
    expect(rule(NAV, ".wb-space-nav .wb-nav-menu")?.body).toContain("padding: 0");
    expect(NAV).not.toContain("!important");
    // Розгорнута панель на телефоні лягає від краю екрана (`left: 0`), тож
    // беріг їй задають її ж відступи: знак мусить лишитись там, де він у смузі.
    expect(
      mediaBlocks(NAV).some((body) =>
        /\.wb-space-nav:not\(\.wb-nav--collapsed\)\s*\{[^}]*padding-left: var\(--sp-4\)/.test(body),
      ),
    ).toBe(true);
  });

  it("крок пункту панелі дорівнює кроку клітинки смуги — інакше знаки розходяться", () => {
    // Мірку пункту задає **сам сайдбар** і рівно один раз: доки її писали і
    // бренд, і панель Простору, знаки двох колонок сходились лише з
    // `!important`, а сайдбар виглядав як дві різні деталі.
    expect(rule(APP, ".wb-nav-item")?.body).toContain("min-height: var(--sidebar-item-h)");
    // Бренд мірок пункту не переписує — ні своїм `padding`, ні `min-height`.
    for (const brand of ["apple.css", "android.css"]) {
      const file = css(`packages/shared/src/styles/${brand}`);
      expect(file, brand).not.toContain(`.wb-nav-item {`);
      expect(file, brand).not.toContain("--sidebar-item-h");
    }
    // Інша половина пари: клітинка смуги бере ту саму цифру.
    expect(rule(SPACE, ".wb-space-page .wb-tools-bar")?.body).toContain(
      "--tools-row-h: var(--space-rail)",
    );
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
    // з'їжджав би знаки на цей відступ — і око бачило б другу лінію. Правило
    // **одне на обидва стани**: згорнута панель не має ні свого відступу, ні
    // свого `!important` — знак лишається на місці саме тому, що мірок менше.
    const menu = rules(NAV).filter((entry) => entry.selector === ".wb-space-nav .wb-nav-menu");
    expect(menu.length, "правило списку панелі мусить бути одне").toBe(1);
    expect(menu[0]?.body).toContain("padding: 0");
  });

  it("назва екрана — підпис відкритого розділу, а не «Простір» на всіх", () => {
    // Друга копія підпису тут була б третім місцем, яке треба правити при
    // перейменуванні розділу: ім'я беруть зі `space-tabs`.
    const page = source("web-platform-dev/src/pages/SpacePage.tsx");
    expect(page).toContain('nav.named ? nav.current.label : "Простір"');
    expect(source("web-platform-dev/src/pages/useSpaceNav.ts")).toContain("named");
  });
});

describe("оголошення — рядок, який відкривається", () => {
  const CARD = "web-platform-dev/src/pages/AdCard.tsx";

  it("назва стоїть **перед** видом: вид — підпис під нею, а не шапка над нею", () => {
    // Доти в рядку першим був чип виду («Подарую»), і назва читалась другою —
    // тоді як у гри, сторінки чи людини перша саме назва.
    const card = source(CARD);
    expect(card.indexOf("wb-ad-title")).toBeLessThan(card.indexOf("wb-ad-meta"));
    expect(source("web-platform-dev/src/pages/ads-view.ts")).toContain("adKindLabel");
  });

  it("свого знака в оголошення немає — його розрізняє написане", () => {
    // Знак виду стояв там само, де знак гри чи аватар, і працював як ще один
    // підпис: його все одно треба було прочитати (а «Подарую · Львів» і так
    // сказано текстом). У гри є її власний знак, у людини — обличчя, у
    // оголошення — тільки написане.
    expect(source(CARD)).not.toContain("wb-ad-icon");
    expect(source(CARD)).not.toContain("adKindIcon");
    expect(source("web-platform-dev/src/pages/ads-view.ts")).not.toContain("adKindIcon");
    // Правил для клітинки, якої немає, теж не лишається.
    expect(SPACE).not.toContain("wb-ad-icon");
  });

  it("шеврон є в кожного — за рядком справді стоїть поверхня", () => {
    expect(source(CARD)).toContain("wb-ad-more");
    expect(source(CARD)).toContain("MenuModal");
  });

  it("дії живуть у поверхні, а не в рядку", () => {
    // Три підписи під кожним оголошенням займали власний рядок у стрічці, яку
    // читають, а в рядку їх місця немає зовсім: там сітка з трьох клітинок.
    const card = source(CARD);
    expect(card).not.toContain("wb-ad-menu");
    expect(card).not.toContain("wb-ad-head");
    expect(card).toContain("wb-ad-view-actions");
    // Поверхня закрита: у розмітці рядка жодного підпису дії немає.
    expect(card.indexOf("wb-ad-view-actions")).toBeGreaterThan(card.indexOf("MenuModal"));
  });

  it("клітинки рядка **названі** — інакше `grid-area` збирає їх усі в одну", () => {
    // Так і було: у дітей стояли `grid-area: text` / `more`, а схеми клітинок у
    // самої кнопки не було. За специфікацією ім'я, якого немає серед ліній сітки,
    // шукається серед **уявних** — і обидві клітинки (разом із шевроном) знаходили
    // ту саму першу. На екрані це читалось як «текст оголошення зміщено»,
    // а насправді сітки не було зовсім.
    const row = rule(SPACE, CONTENT_ROW);
    expect(row, "схема клітинок мусить бути в рядка").toBeDefined();
    expect(row?.body).toContain('grid-template-areas: "text more"');
    // Провідної колонки в контенту немає — текст стає на лінію вмісту.
    expect(row?.body).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(
      rule(SPACE, ".wb-space-page .wb-menu-item-text, .wb-space-page .wb-ad-text")?.body,
    ).toContain("grid-area: text");
    expect(
      rule(SPACE, ".wb-space-page .wb-menu-item-more, .wb-space-page .wb-ad-more")?.body,
    ).toContain("grid-area: more");
  });

  it("«плитки» міняють розкладку, а не саму лише ширину", () => {
    // Інакше вибір вигляду — декоративний: людина тицяє й не бачить різниці.
    expect(rule(SPACE, ".wb-space-page .wb-collection--cards .wb-ad-body")?.body).toContain(
      "-webkit-line-clamp: 3",
    );
    expect(rule(SPACE, ".wb-space-page .wb-collection--rows .wb-ad-body")?.body).toContain(
      "-webkit-line-clamp: 1",
    );
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
