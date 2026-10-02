/**
 * Панель діалогу — тести натискань на inline-кнопках.
 *
 * **Це основний спосіб натиснути кнопку**, тож тут перевіряється дві речі:
 * що панель з'являється новим повідомленням (а не редагується старим), і що
 * кнопки з минулих екранів знімаються — щоб вони жили тільки під останнім
 * повідомленням, а не кожна під кожним написаним.
 *
 * @module bot-dev/src/modules/access/contact/panel.test
 */

import { describe, expect, it } from "vitest";
import { CONTACT } from "../../../shared/config/texts";
import { chat, tap } from "./fixture";

describe("панель діалогу", () => {
  it("«Написати адміну» відкриває діалог і надсилає панель із однією кнопкою", async () => {
    const store = chat();

    expect(await tap(store, "contact:write")).toBe(true);
    expect(store.ctx.user?.admin_dialog_open).toBe(1);
    expect(store.sent[0]?.labels).toEqual([CONTACT.close]);
    // Номер панелі запам'ятовано, щоб наступна дія зняла кнопки саме з неї.
    expect(store.ctx.user?.admin_panel_id).toBe(1);
  });

  it("⛔ стара кнопка «Написати адміну» зникає в момент натискання", async () => {
    // Інакше в чаті лишалися б дві кнопки відкритих дialogів, і «під останнім
    // повідомленням» перестало б бути правдою. Екран відмови лишається — у ньому
    // пояснення, чому продукт закритий.
    const store = chat({ screenId: 11 });

    await tap(store, "contact:write");

    expect(store.detached).toContain(11);
    expect(store.cleared).toHaveLength(0);
  });

  it("⛔ чужий callback — не ours: роутер має далі відкрити сторінку", async () => {
    const store = chat();

    expect(await tap(store, "mydate_1980-03-03")).toBe(false);
    expect(store.sent).toHaveLength(0);
  });

  it("⛔ повторне «Написати адміну» не стирає написане й нічого не показує", async () => {
    // Кнопка є і на екрані відмови, і на панелі: натискання не має бути «новим
    // стартом» і не має плодити ще один такий самий екран.
    const store = chat({ open: true, draft: "вже написано", count: 2 });

    expect(await tap(store, "contact:write")).toBe(true);
    expect(store.sent).toHaveLength(0);
    expect(store.ctx.user?.admin_dialog_text).toBe("вже написано");
    expect(store.ctx.user?.admin_dialog_count).toBe(2);
  });

  it("⛔ старий статусний екран зникає, а новий стає на його місце", async () => {
    const store = chat({ open: true, draft: "питання", panelId: 42 });

    await tap(store, "contact:send");

    expect(store.cleared).toEqual([42]);
  });

  it("«Відправити» зберігає звернення, дякує й повертає «Написати адміну»", async () => {
    const store = chat({ open: true, draft: "питання", panelId: 42 });

    expect(await tap(store, "contact:send")).toBe(true);

    expect(store.inserted).toEqual(["питання"]);
    expect(store.sent.at(-1)).toMatchObject({ text: CONTACT.sent, labels: [CONTACT.write] });
    expect(store.ctx.user?.admin_dialog_open).toBe(0);
    expect(store.ctx.user?.admin_dialog_count).toBe(0);
  });

  it("«Закрити» не відсилає нічого й повертає «Написати адміну»", async () => {
    const store = chat({ open: true, draft: "випадково", panelId: 42 });

    await tap(store, "contact:close-without-send");

    expect(store.inserted).toHaveLength(0);
    expect(store.sent.at(-1)?.text).toBe(CONTACT.closed(false));
  });
});
