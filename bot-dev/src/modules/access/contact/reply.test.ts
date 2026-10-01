/**
 * Діалог з адміном за текстом у чаті — тести обробки кроків.
 *
 * Головне тут — не те, що ми пишемо, а те, **що панель оновлюється** після
 * кожного написаного повідомлення: без трьох кнопок «Відправити / Завершити /
 * Закрити» написане просто некуди відіслати. Раніше ми надсилали повідомлення з
 * реплай-клавіатурою, тож ці кнопки не з'являлися ніде.
 *
 * @module bot-dev/src/modules/access/contact/reply.test
 */

import { describe, expect, it } from "vitest";
import { CONTACT } from "../../../shared/config/texts";
import { chat, step } from "./fixture";

describe("діалог за текстом у чаті", () => {
  it("⛔ чужий текст до натискання «Написати адміну» — не наш крок", async () => {
    const store = chat();
    expect(await step(store, "а може я теж щось напишу?")).toBe(false);
    expect(store.sent).toHaveLength(0);
  });

  it("«Написати адміну» відкриває дialog і питає, що людину цікавить", async () => {
    const store = chat();

    expect(await step(store, CONTACT.write)).toBe(true);
    expect(store.sent[0]?.text).toBe(CONTACT.started);
    expect(store.ctx.user?.admin_dialog_open).toBe(1);
  });

  it("⛔ фото не приймається, але людина дізнається про це", async () => {
    const store = chat({ open: true, draft: "вже написано" });

    await step(store, undefined);

    expect(store.texts()).toContain(CONTACT.textOnly);
    // Мовчки проігнорувати означало б, що її фото загубилося.
    expect(store.ctx.user?.admin_dialog_text).toBe("вже написано");
  });

  it("⛔ після першого повідомлення панель має три кнопки, а не «Закрити діалог»", async () => {
    const store = chat({ open: true });

    await step(store, "хочу запросити доступ");

    expect(store.ctx.user?.admin_dialog_text).toBe("хочу запросити доступ");
    expect(store.sent[0]?.labels).toEqual([
      CONTACT.send,
      CONTACT.sendAndClose,
      CONTACT.closeWithoutSend,
    ]);
  });

  it("друге повідомлення додається до першого, а панель лишається з кнопками", async () => {
    const store = chat({ open: true });

    await step(store, "перше");
    await step(store, "друге");

    expect(store.ctx.user?.admin_dialog_text).toBe("перше\n\nдруге");
    // Панель уже існує, тож ми її редагуємо, а не плодимо нові повідомлення.
    expect(store.edited[0]?.labels).toContain(CONTACT.sendAndClose);
  });

  it("⛔ команда не чернетка: `/start` лишається тим, чим є", async () => {
    // Написане не зникає, але й не стає текстом звернення — вирішує людина.
    const store = chat({ open: true, draft: "написане" });

    expect(await step(store, "/start")).toBe(false);
    expect(store.ctx.user?.admin_dialog_text).toBe("написане");
  });
});
