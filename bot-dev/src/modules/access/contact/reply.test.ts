/**
 * Діалог з адміном через реплай-клавіатуру — тести обробки кроків.
 *
 * Перевіряється те, що бачить людина: що натискає, що їй відповідають і що
 * зберігається. Клавіатури, чернетка й панель перевірені в `state.test`,
 * тут — лише рішення бота: зберегти, закрити, з��игнорувати фото.
 *
 * @module bot-dev/src/modules/access/contact/reply.test
 */

import { describe, expect, it } from "vitest";
import { CONTACT } from "../../../shared/config/texts";
import { chat, step } from "./fixture";

describe("діалог з адміном", () => {
  it("⛔ чужий текст до натискання «Написати адміну» — не наш крок", async () => {
    const store = chat();
    expect(await step(store, "а може я теж щось напишу?")).toBe(false);
    expect(store.sent).toHaveLength(0);
  });

  it("«Написати адміну» відкриває діалог, питає, що цікавить, і дає одну клавіатуру", async () => {
    const store = chat();

    expect(await step(store, CONTACT.write)).toBe(true);
    expect(store.texts()).toContain(CONTACT.started);
    expect(store.ctx.user?.admin_dialog_open).toBe(1);
    // Поки не написано нічого — надсилати нікуди, закривати є що.
    expect(store.labelsOfLast()).toEqual([CONTACT.close]);
    expect(store.inserted).toHaveLength(0);
  });

  it("⛔ фото не приймається, але людина дізнається про це", async () => {
    const store = chat({ open: true, draft: "вже написано" });

    await step(store, undefined);

    expect(store.texts()).toContain(CONTACT.textOnly);
    // Мовчки проігнорувати означало б, що її фото загубилося.
    expect(store.ctx.user?.admin_dialog_text).toBe("вже написано");
  });

  it("після першого повідомлення клавіатура міняється на три кнопки", async () => {
    const store = chat({ open: true });

    await step(store, "хочу запросити доступ");

    expect(store.ctx.user?.admin_dialog_text).toBe("хочу запросити доступ");
    expect(store.labelsOfLast()).toEqual([
      CONTACT.send,
      CONTACT.sendAndClose,
      CONTACT.closeWithoutSend,
    ]);
  });

  it("кілька повідомлень — одне звернення, а не останнє", async () => {
    const store = chat({ open: true });

    await step(store, "перше");
    await step(store, "друге");
    await step(store, CONTACT.sendAndClose);

    expect(store.inserted).toEqual(["перше\n\nдруге"]);
  });

  it("після відправки людина отримує подяку, а адмін — хто написав і що", async () => {
    const store = chat({ open: true, draft: "питання" });

    expect(await step(store, CONTACT.sendAndClose)).toBe(true);

    expect(store.texts()).toContain(CONTACT.sent);
    expect(store.adminTexts().join("\n")).toContain("id 555");
    expect(store.adminTexts().join("\n")).toContain("питання");
  });

  it("«Відправити» лишає діалог відкритим, але вже без написаного", async () => {
    const store = chat({ open: true, draft: "перша частина" });

    await step(store, CONTACT.send);

    expect(store.inserted).toEqual(["перша частина"]);
    expect(store.ctx.user?.admin_dialog_open).toBe(1);
    expect(store.ctx.user?.admin_dialog_text).toBe("");
  });

  it("«Закрити без відправки» викидає написане, а не надсилає його", async () => {
    const store = chat({ open: true, draft: "шкода, випадково" });

    await step(store, CONTACT.closeWithoutSend);

    expect(store.inserted).toHaveLength(0);
    expect(store.texts()).toContain(CONTACT.closed(false));
    expect(store.ctx.user?.admin_dialog_open).toBe(0);
  });

  it("«Закрити діалог» працює і з порожньою чернеткою", async () => {
    const store = chat({ open: true });

    await step(store, CONTACT.close);

    expect(store.texts()).toContain(CONTACT.closed(false));
    expect(store.labelsOfLast()).toEqual([CONTACT.write]);
  });

  it("⛔ база впала — не кажемо «отримано» і не змушуємо набирати заново", async () => {
    const store = chat({ open: true, draft: "довгий текст", saveFails: true });

    await step(store, CONTACT.send);

    expect(store.texts()).toContain(CONTACT.failed);
    expect(store.texts()).not.toContain(CONTACT.sent);
    expect(store.ctx.user?.admin_dialog_text).toBe("довгий текст");
  });

  it("⛔ команда не чернетка: `/start` лишається тим, чим є", async () => {
    // Написане не зникає, але й не стає текстом звернення — вирішує людина.
    const store = chat({ open: true, draft: "написане" });

    expect(await step(store, "/start")).toBe(false);
    expect(store.ctx.user?.admin_dialog_text).toBe("написане");
  });
});
