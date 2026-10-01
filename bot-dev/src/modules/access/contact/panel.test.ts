/**
 * Панель дialogу — тести натискань на inline-кнопках.
 *
 * **Це основний спосіб натиснути кнопку**, тож тут перевіряється, що панель
 * редагується, а не плодиться новою, і що натискання веде в те саме рішення,
 * що й кнопка під чатом (`reply.test`).
 *
 * @module bot-dev/src/modules/access/contact/panel.test
 */

import { describe, expect, it } from "vitest";
import { CONTACT } from "../../../shared/config/texts";
import { chat, tap } from "./fixture";

describe("панель дialogу", () => {
  it("«Написати адміну» відкриває дialog і надсилає панель із однією кнопкою", async () => {
    const store = chat();

    expect(await tap(store, "contact:write")).toBe(true);
    expect(store.ctx.user?.admin_dialog_open).toBe(1);
    expect(store.sent[0]?.labels).toEqual([CONTACT.close]);
    // Номер панелі запам'ятовано, щоб наступна дія редагувала те саме повідомлення.
    expect(store.ctx.user?.admin_panel_id).toBe(1);
  });

  it("⛔ чужий callback — не ours: роутер має далі відкрити сторінку", async () => {
    const store = chat();

    expect(await tap(store, "mydate_1980-03-03")).toBe(false);
    expect(store.sent).toHaveLength(0);
  });

  it("⛔ повторне «Написати адміну» не стирає написане", async () => {
    // Кнопка є і на екрані відмови, і на панелі: натискання не має бути «новим стартом».
    const store = chat({ open: true, draft: "вже написано" });

    await tap(store, "contact:write");

    expect(store.ctx.user?.admin_dialog_text).toBe("вже написано");
  });

  it("«Відправити і завершити» зберігає звернення, дякує й повертає «Написати адміну»", async () => {
    const store = chat({ open: true, draft: "питання", panelId: 42 });

    expect(await tap(store, "contact:send-close")).toBe(true);

    expect(store.inserted).toEqual(["питання"]);
    expect(store.edited[0]).toMatchObject({ text: CONTACT.sent, labels: [CONTACT.write] });
    expect(store.ctx.user?.admin_dialog_open).toBe(0);
  });

  it("«Закрити без відправки» не надсилає нічого", async () => {
    const store = chat({ open: true, draft: "випадково", panelId: 42 });

    await tap(store, "contact:close-without-send");

    expect(store.inserted).toHaveLength(0);
    expect(store.edited[0]?.text).toBe(CONTACT.closed(false));
  });

  it("⛔ мертва панель не ламає нічого: надсилаємо нову", async () => {
    // Повідомлення могли видалити — тоді редагування падає, а діалог лишається.
    const store = chat({ open: true, draft: "текст" });

    await tap(store, "contact:close");

    expect(store.sent.length).toBeGreaterThan(0);
  });
});
