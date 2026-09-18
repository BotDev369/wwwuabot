/**
 * Форма контакту — де живуть **власні** поля.
 *
 * Перевіряємо те, що вирішує, чи працює екран: поля є **всі** (ім'я,
 * `@username`, хештеги, примітки), порожнє ім'я зберегти не дає, а показані
 * значення — поточні, а не порожні.
 *
 * Окремо — те, чого у формі бути **не повинно**, і це не дрібниця:
 *
 *   - поля «Telegram ID» немає: id людини власник не знає, а вписане число
 *     робило б контакт приєднаним без жодного переходу;
 *   - немає ні етапів, ні лінка, ні дат: це **факти**, і показує їх тіло рядка.
 *     Форма, яка показує їх удруге, змушувала б тримати їх узгодженими в двох
 *     місцях (та сама межа, що в нотатках: редактор редагує, картка показує).
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не набирання тексту.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Contact } from "@wwwuabot/shared/contacts";
import { ContactSheet } from "./ContactSheet";

/** Контакт-фікстура: усе, крім переданого, — «щойно завели». */
function contact(over: Partial<Contact> = {}): Contact {
  return {
    id: 1,
    name: "Карас",
    username: null,
    tags: [],
    notes: "",
    code: null,
    deepLink: null,
    joinedUserId: null,
    joinedBotAt: null,
    joinedPlatformAt: null,
    createdAt: "2026-09-18 03:40:00",
    updatedAt: "2026-09-18 03:40:00",
    invitedCount: 0,
    ...over,
  };
}

function render(over: Partial<Contact> = {}): string {
  return renderToStaticMarkup(
    <ContactSheet contact={contact(over)} onSave={() => {}} onClose={() => {}} />,
  );
}

describe("ContactSheet", () => {
  it("тримає всі власні поля", () => {
    const html = render();

    expect(html).toContain("Ім&#x27;я");
    expect(html).toContain("@username");
    expect(html).toContain("Хештеги");
    expect(html).toContain("Примітки");
  });

  it("показує поточні значення полів, а не порожні", () => {
    const html = render({ username: "karas", notes: "знайомий зі школи" });

    expect(html).toContain('value="karas"');
    expect(html).toContain("знайомий зі школи");
  });

  it("⛔ без імені зберегти не можна — список не стає стовпчиком безіменних", () => {
    expect(render({ name: "" })).toContain("disabled");
  });

  it("⛔ поля «Telegram ID» немає: id не вписують, його бачить бот", () => {
    const html = render({ joinedUserId: 6281898553 });

    expect(html).not.toContain("Telegram ID");
    expect(html).not.toContain("wb-contact-telegram-input");
    // І самого id тут теж немає: це факт, і його видно в тілі рядка.
    expect(html).not.toContain("6281898553");
  });

  it("⛔ фактів (етапів, лінка, дат) форма не показує — їх показує рядок", () => {
    const html = render({ code: "inv-8f3k2q", deepLink: "https://t.me/bot?start=inv-8f3k2q" });

    expect(html).not.toContain("Запрошено");
    expect(html).not.toContain("Створити лінк");
    expect(html).not.toContain("Створено");
    expect(html).not.toContain("inv-8f3k2q");
  });

  it("збереження й скасування стоять поруч", () => {
    const html = render();
    const actions = html.slice(html.indexOf("wb-sheet-actions"));

    expect(html).toContain("Зберегти");
    expect(html).toContain("Скасувати");
    expect(actions.match(/<button/g) ?? []).toHaveLength(2);
  });
});
