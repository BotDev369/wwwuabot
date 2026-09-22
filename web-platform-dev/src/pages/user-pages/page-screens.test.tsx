/**
 * Сторінки з шаблону — сторож **порядку кроків**, а не розмітки заради розмітки.
 *
 * Тут ламається тихо: досить повернути створення у форму з підписами полів — і
 * людина знову обирає шаблон наосліп, не бачачи, що вийде; або досить показати
 * в редакторі порожні поля без підписів — і сторінка перестає бути схожою на
 * себе. Тому перевіряється:
 *
 * - **вибір показує**, а не описує: у кожної картки є текст-приклад шаблону й
 *   справжня розмітка сторінки (`page-zone--main`), а прев'ю — картинка
 *   (`aria-hidden`, дотиків не ловить);
 * - **текст правлять на самій сторінці**: кожне поле шаблону — поле вводу з
 *   підказкою, а підписи структури («Коли», «Про себе») лишаються підписами;
 * - **крок живе в адресі**: `?template=event` відкриває редактор події, а без
 *   нього — вибір шаблону; невідомий ключ вертає до вибору, а не в порожнечу;
 * - **порожню назву зберегти не можна**, а приватність типово вимкнена.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не дотики: так само зроблено в `SpaceAdsTab.test.tsx`.
 *
 * @module web-platform-dev/src/pages/user-pages/page-screens.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PAGE_TEMPLATES, pageTemplate, primaryField } from "@wwwuabot/shared/pages";
import {
  PAGE_TEMPLATE_PARAM,
  PAGES_NEW_PATH,
  readPageTemplate,
  withPageTemplate,
} from "../../app/routes";
import { PageEditor, type PageEditorMode } from "./PageEditor";
import { PageTemplatePicker } from "./PageTemplatePicker";
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

const picker = renderToStaticMarkup(<PageTemplatePicker onBack={noop} onPick={noop} />);

const editor = (
  mode: PageEditorMode,
  initial: Parameters<typeof PageEditor>[0]["initial"],
): string =>
  renderToStaticMarkup(<PageEditor mode={mode} initial={initial} onBack={noop} onSaved={noop} />);

const card = pageTemplate("card");
const event = pageTemplate("event");

describe("вибір шаблону", () => {
  it("показує КОЖЕН шаблон разом із його текстом-прикладом", () => {
    for (const template of PAGE_TEMPLATES) {
      expect(picker).toContain(template.label);
      expect(picker).toContain(inMarkup(template.hint));
      // Текст людини в прикладі — той самий, що дає `preview` у даних шаблону:
      // картка без нього показувала б порожню сторінку.
      expect(picker).toContain(inMarkup(template.preview[primaryField(template).key]));
      expect(picker).toContain(`Обрати шаблон: ${template.label}`);
    }
    expect(picker.match(/wb-template-card"/g)).toHaveLength(PAGE_TEMPLATES.length);
  });

  it("перегляд — **справжня сторінка**, а не картинка збоку", () => {
    // Той самий `PageRenderer`, той самий `page_data`: розійтись із
    // результатом перегляд не може, бо це буквально він.
    expect(picker).toContain("page-zone--main");
    expect(picker.match(/wb-template-preview/g)?.length).toBe(PAGE_TEMPLATES.length);
  });

  it("перегляд — картинка: усередині справжні блоки, і дотик по них не пройде", () => {
    expect(picker).toContain('aria-hidden="true"');
    // Дотик ловить `pointer-events: none` на самому прев'ю: інакше перше
    // торкання до прикладу відкривало б чуже замість вибору шаблону.
    expect(picker).toContain("wb-template-preview");
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

  it("підписи структури лишаються підписами, а не полями", () => {
    const html = editor("create", { template: "event" });

    for (const field of event.fields) {
      if (!field.block.title) continue;
      // Підпис малює шаблон: його не редагують, і поля вводу під нього немає.
      expect(html, field.key).toContain(`>${field.block.title}</span>`);
    }
    // А значення — поля: назва події, коли, де, «що буде», умови.
    expect(html.match(/wb-page-field-input/g)).toHaveLength(event.fields.length);
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

  it("без шаблону — вибір: порожній редактор був би глухим кутом", () => {
    // Адресу могли написати руками або лишити від старої версії: за невідомим
    // ключем редактора немає, і людина мусить побачити вибір шаблону.
    expect(readPageTemplate(new URLSearchParams(""))).toBeNull();
    expect(readPageTemplate(new URLSearchParams("template=site"))).toBeNull();
  });

  it("вибір шаблону — лише параметр, а не друга адреса", () => {
    expect(withPageTemplate(PAGES_NEW_PATH, "event")).toBe("/pages/new?template=event");
    // Чужі параметри лишаються на місці: крок додається до адреси, а не заміняє її.
    const kept = withPageTemplate("/pages/new?from=hub", "card");
    expect(kept).toContain("from=hub");
    expect(kept).toContain(`${PAGE_TEMPLATE_PARAM}=card`);
  });

  it("адреса й екран домовляються про один ключ — наскрізно", () => {
    const path = withPageTemplate(PAGES_NEW_PATH, "event");
    const params = new URLSearchParams(path.split("?")[1]);
    expect(readPageTemplate(params)).toBe("event");
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
