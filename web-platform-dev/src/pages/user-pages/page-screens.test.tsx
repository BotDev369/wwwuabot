/**
 * Сторінки з шаблону — сторож **порядку кроків**, а не розмітки заради розмітки.
 *
 * Тут ламається тихо: досить повернути створення у форму з підписами полів — і
 * людина знову обирає шаблон наосліп, не бачачи, що вийде; досить знову обрізати
 * перегляд до картки в списку — і від сторінки лишається уривок; або досить
 * показати в редакторі порожні поля без підписів — і сторінка перестає бути
 * схожою на себе. Тому перевіряється:
 *
 * - **список лише веде**: рядок несе підпис і пояснення, а розмітки сторінки в
 *   ньому немає — перегляд живе окремим кроком;
 * - **перегляд — це сама сторінка**: та сама розмітка (`page-zone--main`),
 *   усі тексти-приклади й обидва рівні (заголовок і тіло), і при цьому
 *   **жодного екрана платформи навколо** — ні `wb-page`, ні шапки, ні
 *   пояснення перед полотном: будь-що з цього знову робить із перегляду
 *   картку зі сторінкою замість сторінки;
 * - **текст правлять на самій сторінці**: кожне поле шаблону — поле вводу з
 *   підказкою, а підписи структури («Коли», «Про себе») лишаються підписами;
 * - **крок живе в адресі**: `?preview=event` відкриває перегляд, `?template=event`
 *   — редактор події, а без обох — список; невідомий ключ вертає до списку, а не
 *   в порожнечу; вибір знімає попередній крок із адреси;
 * - **порожню назву зберегти не можна**, а приватність типово вимкнена.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не дотики: так само зроблено в `SpaceAdsTab.test.tsx`.
 *
 * @module web-platform-dev/src/pages/user-pages/page-screens.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PAGE_TEMPLATES, pageTemplate, type PageTemplateKey } from "@wwwuabot/shared/pages";
import {
  PAGE_TEMPLATE_PARAM,
  PAGES_NEW_PATH,
  readPagePreview,
  readPageTemplate,
  withPagePreview,
  withPageTemplate,
} from "../../app/routes";
import { PageEditor, type PageEditorMode } from "./PageEditor";
import { PageTemplatePicker } from "./PageTemplatePicker";
import { PageTemplatePreview } from "./PageTemplatePreview";
import { parseUserPageId } from "./pages-view";

const noop = (): void => {};

/** React екранує лапки в розмітці (`зв'язатися` → `зв&#x27;язатися`). */
const inMarkup = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;");

const picker = renderToStaticMarkup(<PageTemplatePicker onBack={noop} onPreview={noop} />);

const preview = (key: PageTemplateKey): string =>
  renderToStaticMarkup(
    <PageTemplatePreview template={pageTemplate(key)} onBack={noop} onPick={noop} />,
  );

const editor = (
  mode: PageEditorMode,
  initial: Parameters<typeof PageEditor>[0]["initial"],
): string =>
  renderToStaticMarkup(<PageEditor mode={mode} initial={initial} onBack={noop} onSaved={noop} />);

const card = pageTemplate("card");
const event = pageTemplate("event");

/** Параметри адреси так, як їх читає екран: `?a=1&b=2` → `a=1&b=2`. */
const paramsOf = (path: string): URLSearchParams => new URLSearchParams(path.split("?")[1]);

describe("список шаблонів", () => {
  it("називає КОЖЕН шаблон і пояснює його одним реченням", () => {
    for (const template of PAGE_TEMPLATES) {
      expect(picker).toContain(template.label);
      expect(picker).toContain(inMarkup(template.hint));
    }
    expect(picker.match(/wb-template-row"/g)).toHaveLength(PAGE_TEMPLATES.length);
  });

  it("сам сторінку не показує — вона належить кроку перегляду", () => {
    // Обрізаний уривок у рядку й був тією «розміткою, яку видно наполовину»:
    // сторінку показують цілком і окремим екраном.
    expect(picker).not.toContain("page-zone--main");
  });
});

describe("перегляд шаблону", () => {
  it("показує сторінку **цілком**: усі тексти шаблону, а не перші рядки", () => {
    for (const template of PAGE_TEMPLATES) {
      const html = preview(template.key);
      for (const field of template.fields) {
        expect(html, `${template.key}.${field.key}`).toContain(
          inMarkup(template.preview[field.key]),
        );
      }
      // Той самий `PageRenderer`, той самий `page_data`: розійтись із
      // результатом перегляд не може, бо це буквально він.
      expect(html).toContain("page-zone--main");
    }
  });

  it("щаблі полів видно так, як вони будуть на сторінці", () => {
    // Назва — найбільший щабель, рядок під нею — на щабель нижче, текст
    // розділу — приглушене тіло: перегляд, у якому все однаковим шрифтом,
    // не показує шаблону нічого.
    const html = preview("card");
    expect(html).toContain(inMarkup(card.preview.title));
    expect(html).toContain(inMarkup(card.preview.about));
    // Це ті самі щаблі, які малює редактор: `display` ↔ `wb-text-2xl`,
    // `lead` ↔ `wb-text-lg`, `body` ↔ приглушене тіло `wb-text-secondary`.
    expect(html).toContain("wb-text-2xl");
    expect(html).toContain("wb-text-lg");
    expect(html).toContain("wb-text-secondary");
  });

  it("показує сторінку з каркаса — картки й розділи, а не абзаци на тлі", () => {
    // Шаблон — це готова сторінка, і в ній видно саме її будову.
    const html = preview("card");
    expect(html).toContain("wb-block-card");
    expect(html).toContain(inMarkup(card.preview.title));
    expect(html).toContain(inMarkup(card.preview.contact));
  });

  it("це сама сторінка, а не картка з нею: навколо немає екрана платформи", () => {
    const html = preview("event");
    // Полотно не має ні рамки, ні власної розкладки — усе це дає `page-layout`
    // та `main` оболонки, тобто рівно те, що бачить відвідувач.
    expect(html).toContain("wb-template-canvas");
    expect(html).not.toContain("wb-template-frame");
    // Рівно те, чого не може бути навколо: шапка екрана платформи, пояснення
    // перед полотном і будь-яке обрізання.
    expect(html).not.toContain("wb-page-head");
    expect(html).not.toContain("wb-template-lead");
    expect(html).not.toContain("wb-template-preview");
    expect(html).toContain('aria-hidden="true"');
  });

  it("керування стоїть **поверх** сторінки — однією смугою, а не навколо неї", () => {
    const html = preview("card");
    // «Назад» і «обрати» — в одній липкій смузі; друга дія названа словом, а не
    // знаком, бо нею шаблон і беруть.
    expect(html).toContain('class="wb-template-actions"');
    expect(html).toContain('aria-label="Назад"');
    // Смуга йде **після** полотна, а не перед ним: сторінку видно з першого
    // рядка, а не з-під шапки.
    expect(html.indexOf("wb-template-canvas")).toBeLessThan(html.indexOf("wb-template-actions"));
  });

  it("шаблон беруть **окремою кнопкою**, а не дотиком до сторінки", () => {
    for (const template of PAGE_TEMPLATES) {
      expect(preview(template.key)).toContain(`Обрати шаблон: ${template.label}`);
    }
  });
});

describe("редактор сторінки", () => {
  it("текст правлять **на сторінці**: поле на кожне поле шаблону, з підказкою", () => {
    const html = editor("create", { template: "card" });

    for (const field of card.fields) {
      expect(html, field.key).toContain(`id="wb-page-field-${field.key}"`);
      expect(html, field.key).toContain(`placeholder="${inMarkup(field.placeholder)}"`);
    }
    expect(html.match(/wb-page-field-input/g)).toHaveLength(card.fields.length);
    // Сторінка перед очима — та сама поверхня, а не список полів.
    expect(html).toContain("wb-page-editor");
  });

  it("підписи розділів («Де», «Що буде») лишаються підписами, а не полями", () => {
    const html = editor("create", { template: "event" });

    for (const field of event.fields) {
      if (!field.section) continue;
      // Підпис малює шаблон: його не редагують, і поля вводу під нього немає.
      expect(html, field.key).toContain(`>${field.section}</span>`);
    }
    // А значення — поля: назва події, коли, де, «що буде», умови.
    expect(html.match(/wb-page-field-input/g)).toHaveLength(event.fields.length);
  });

  it("значення видно тим щаблем, яким його побачать на сторінці", () => {
    // Інакше редактор вирівнював би не те, що вийде: назва — найбільшим
    // щаблем, текст розділу — приглушеним тілом.
    const html = editor("create", { template: "card" });
    expect(html).toContain("wb-page-field-value--display");
    expect(html).toContain("wb-page-field-value--lead");
    expect(html).toContain("wb-page-field-value--body");
  });

  it("порожню назву зберегти не можна — кнопка вимкнена", () => {
    expect(editor("create", { template: "card" })).toMatch(/wb-btn-primary" disabled/);
  });

  it("назва є — сторінку можна зберегти", () => {
    expect(editor("create", { template: "card", values: { title: "Олена" } })).not.toMatch(
      /wb-btn-primary" disabled/,
    );
  });

  it("приватність типово вимкнена, а адресу не питають — її складуть із назви", () => {
    const html = editor("create", { template: "card" });
    expect(html).toContain('role="switch" aria-checked="false"');
    expect(html).toContain("складемо з назви");
  });

  it("правка починається з написаного й не перейменовує себе", () => {
    const html = editor("edit", {
      id: 7,
      template: "event",
      values: { title: "Ярмарок", where: "Парк" },
      address: "osinnii-iarmarok",
      isPublic: true,
    });

    expect(html).toContain("Зберегти зміни");
    expect(html).toContain("Ярмарок");
    expect(html).toContain("Парк");
    // Адреса — збережена, а не перерахована з назви: посилання, яке автор уже
    // комусь надіслав, не мусить змінитись від правки тексту.
    expect(html).toContain('value="osinnii-iarmarok"');
    expect(html).toContain('aria-checked="true"');
  });

  it("вибір шаблону — попередній крок: у редакторі його вже немає", () => {
    expect(editor("create", { template: "card" })).not.toContain("Обрати шаблон");
  });
});

describe("крок у адресі", () => {
  it("шаблон з адреси читається, і саме ним відкривають крок тексту", () => {
    expect(readPageTemplate(new URLSearchParams("template=card"))).toBe("card");
    expect(readPageTemplate(new URLSearchParams("template=event"))).toBe("event");
  });

  it("перегляд теж читається з адреси", () => {
    expect(readPagePreview(new URLSearchParams("preview=card"))).toBe("card");
    expect(readPagePreview(new URLSearchParams("preview=event"))).toBe("event");
  });

  it("без ключа — список: порожній редактор був би глухим кутом", () => {
    // Адресу могли написати руками або лишити від старої версії: за невідомим
    // ключем ні редактора, ні перегляду немає, і людина мусить побачити список.
    expect(readPageTemplate(new URLSearchParams(""))).toBeNull();
    expect(readPageTemplate(new URLSearchParams("template=site"))).toBeNull();
    expect(readPagePreview(new URLSearchParams(""))).toBeNull();
    expect(readPagePreview(new URLSearchParams("preview=site"))).toBeNull();
  });

  it("крок — лише параметр, а не друга адреса", () => {
    expect(withPagePreview(PAGES_NEW_PATH, "event")).toBe("/pages/new?preview=event");
    expect(withPageTemplate(PAGES_NEW_PATH, "event")).toBe("/pages/new?template=event");
    // Чужі параметри лишаються на місці: крок додається до адреси, а не заміняє її.
    const kept = withPageTemplate("/pages/new?from=hub", "card");
    expect(kept).toContain("from=hub");
    expect(kept).toContain(`${PAGE_TEMPLATE_PARAM}=card`);
  });

  it("два кроки не стоять в одній адресі: новий знімає попередній", () => {
    // Інакше «назад» із тексту вів би через перегляд **старішого** ключа, а
    // екран вибирав би між двома кроками за старшинством.
    expect(withPageTemplate(withPagePreview(PAGES_NEW_PATH, "card"), "card")).toBe(
      "/pages/new?template=card",
    );
    expect(withPagePreview(withPageTemplate(PAGES_NEW_PATH, "card"), "event")).toBe(
      "/pages/new?preview=event",
    );
  });

  it("адреса й екран домовляються про один ключ — наскрізно", () => {
    for (const key of ["card", "event"] as const) {
      expect(readPageTemplate(paramsOf(withPageTemplate(PAGES_NEW_PATH, key)))).toBe(key);
      expect(readPagePreview(paramsOf(withPagePreview(PAGES_NEW_PATH, key)))).toBe(key);
    }
  });
});

describe("номер сторінки з адреси", () => {
  it("читається лише ціле більше за нуль", () => {
    expect(parseUserPageId("7")).toBe(7);
    for (const junk of ["abc", "0", "-3", "7.5", "", undefined]) {
      expect(parseUserPageId(junk)).toBeNull();
    }
  });
});
