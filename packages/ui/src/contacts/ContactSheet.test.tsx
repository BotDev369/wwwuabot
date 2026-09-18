/**
 * Картка контакту — де живуть поля.
 *
 * Перевіряємо те, що вирішує, чи працює екран: власні поля є **всі** (номер і
 * дати, ім'я, `@username`, хештеги, примітки), порожнє ім'я зберегти не дає, а
 * лінк показується **за станом контакту** — немає коду → «Створити лінк»; код є
 * → сам діплінк і «Копіювати»; за лінком уже прийшли → кнопки немає взагалі
 * (лінк персональний і вже спрацював).
 *
 * Окремо — те, чого в картці бути **не повинно**: поля «Telegram ID». Id
 * людини власник не знає, а вписане число робило б контакт приєднаним без
 * жодного переходу. Замість поля — три етапи з датами: запрошено → зайшов у
 * бота → зайшов на платформу, і видно їх **усі**, бо різниця між другим і
 * третім і є те, заради чого екран існує.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не набирання тексту.
 */

/// <reference types="node" />

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
    <ContactSheet
      contact={contact(over)}
      index={0}
      copied={false}
      onSave={() => {}}
      onDelete={() => {}}
      onMakeLink={() => {}}
      onCopyLink={() => {}}
      onClose={() => {}}
    />,
  );
}

describe("ContactSheet", () => {
  it("тримає власні поля й номер із датами одним рядком", () => {
    const html = render();

    expect(html).toContain("Ім&#x27;я");
    expect(html).toContain("@username");
    expect(html).toContain("Хештеги");
    expect(html).toContain("Примітки");
    expect(html).toContain("№ 1");
    expect(html).toContain("створено");
  });

  it("⛔ поля «Telegram ID» немає: id не вписують, його бачить бот", () => {
    const html = render({ joinedUserId: 6281898553 });

    expect(html).not.toContain("Telegram ID");
    expect(html).not.toContain('id="wb-contact-telegram-input"');
    // Але сам id видно — як факт, у етапі входу в бота.
    expect(html).toContain("id 6281898553");
  });

  it("показує поточні значення полів, а не порожні", () => {
    const html = render({ username: "karas", notes: "знайомий зі школи" });

    expect(html).toContain('value="karas"');
    expect(html).toContain("знайомий зі школи");
  });

  it("⛔ без імені зберегти не можна — список не стає стовпчиком безіменних", () => {
    expect(render({ name: "" })).toContain("disabled");
  });

  it("контакт без лінка пропонує його скласти", () => {
    const html = render();

    expect(html).toContain("Створити лінк");
    expect(html).not.toContain("Копіювати");
  });

  it("складений лінк показується готовим діплінком, який можна скопіювати", () => {
    const html = render({
      code: "inv-8f3k2q",
      deepLink: "https://t.me/botdev_test_001_bot?start=inv-8f3k2q",
    });

    expect(html).toContain("https://t.me/botdev_test_001_bot?start=inv-8f3k2q");
    expect(html).toContain("Копіювати");
    expect(html).not.toContain("Створити лінк");
  });

  it("⛔ за використаним лінком кнопки немає: він більше нікого не закріпить", () => {
    const html = render({
      code: "inv-8f3k2q",
      deepLink: "https://t.me/botdev_test_001_bot?start=inv-8f3k2q",
      joinedUserId: 555,
      joinedBotAt: "2026-09-18 03:45:00",
    });

    expect(html).toContain("Лінк використано");
    expect(html).not.toContain("Копіювати");
    expect(html).not.toContain("start=inv-8f3k2q");
  });

  it("без імені бота лінк показано кодом, а кнопка не вдає, що працює", () => {
    const html = render({ code: "inv-8f3k2q", deepLink: null });

    expect(html).toContain("inv-8f3k2q");
    expect(html).toContain("disabled");
  });

  it("три етапи видно завжди — і пройдені, і ні", () => {
    const html = render();

    expect(html).toContain("Запрошено");
    expect(html).toContain("Зайшов у бота");
    expect(html).toContain("Зайшов на платформу");
    expect(html).toContain("лінка немає");
    expect((html.match(/ще ні/g) ?? []).length).toBe(2);
  });

  it("часткове приєднання показує дату бота й порожню платформу", () => {
    const html = render({
      code: "inv-8f3k2q",
      joinedUserId: 555,
      joinedBotAt: "2026-09-18 03:45:00",
    });
    const stages = html.slice(html.indexOf("wb-contact-stages"));

    expect(stages).toContain("18.09.2026");
    // Рівно один крок пройдено після «запрошено»: дата одна, друга — «ще ні».
    expect((stages.match(/ще ні/g) ?? []).length).toBe(1);
    expect(stages.match(/wb-contact-stage--done/g) ?? []).toHaveLength(2);
  });

  it("видалення й збереження стоять поруч, і видалення попереджене кольором", () => {
    const html = render();
    const actions = html.slice(html.indexOf("wb-sheet-actions"));

    expect(actions.match(/<button/g) ?? []).toHaveLength(2);
    expect(html).toContain("wb-btn-danger");
  });
});
