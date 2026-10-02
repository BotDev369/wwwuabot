/**
 * Діалог з адміном за текстом у чаті — тести обробки кроків.
 *
 * Головне тут — **відповідь на конкретне повідомлення**: бот має replied саме на
 * те, що написала людина, а лічильник — рахувати її повідомлення. Написане
 * лишається в чаті, тож воно не зникає й відповідь не висить у порожнечі.
 *
 * @module bot-dev/src/modules/access/contact/reply.test
 */

import { describe, expect, it } from "vitest";
import { CONTACT } from "../../../shared/config/texts";
import { chat, step } from "./fixture";

/** Номер повідомлення людини у фіксурі: на нього бот відповідає. */
const GUEST_MESSAGE = 77;

describe("діалог за текстом у чаті", () => {
  it("⛔ чужий текст до натискання «Написати адміну» — не наш крок", async () => {
    const store = chat();
    expect(await step(store, "а може я теж щось напишу?")).toBe(false);
    expect(store.sent).toHaveLength(0);
  });

  it("«Написати адміну» відкриває діалог і питає, що людину цікавить", async () => {
    const store = chat();

    expect(await step(store, CONTACT.write)).toBe(true);
    expect(store.sent[0]?.text).toBe(CONTACT.started);
    expect(store.ctx.user?.admin_dialog_open).toBe(1);
  });

  it("⛔ фото не приймається, але людина дізнається про це", async () => {
    const store = chat({ open: true, draft: "вже написано", count: 1 });

    await step(store, undefined);

    expect(store.texts()).toContain(CONTACT.textOnly);
    // Мовчки проігнорувати означало б, що її фото загубилося.
    expect(store.ctx.user?.admin_dialog_text).toBe("вже написано");
  });

  it("⛔ після повідомлення — лічильник і один ряд кнопок: закрити або відправити", async () => {
    const store = chat({ open: true });

    await step(store, "хочу запросити доступ");

    expect(store.ctx.user?.admin_dialog_text).toBe("хочу запросити доступ");
    expect(store.sent[0]?.text).toBe(CONTACT.counted(1));
    expect(store.sent[0]?.labels).toEqual([CONTACT.closeDraft, CONTACT.send]);
  });

  it("⛔ бот відповідає на те повідомлення, на яке людина написала", async () => {
    const store = chat({ open: true });

    await step(store, "перше");

    // Без `reply_parameters` відповідь була б просто ще одним повідомленням у
    // чаті, і неясно, до чого вона належить.
    expect(store.sent[0]?.replyTo).toBe(GUEST_MESSAGE);
  });

  it("друге повідомлення збільшує лічильник, а кнопки зникають з попереднього", async () => {
    const store = chat({ open: true });

    await step(store, "перше");
    await step(store, "друге");

    expect(store.ctx.user?.admin_dialog_text).toBe("перше\n\nдруге");
    expect(store.sent.at(-1)?.text).toBe(CONTACT.counted(2));
    // Кнопки лишаються тільки під останнім повідомленням.
    expect(store.detached).toContain(1);
  });

  it("⛔ команда не чернетка: `/start` лишається тим, чим є", async () => {
    // Написане не зникає, але й не стає текстом звернення — вирішує людина.
    const store = chat({ open: true, draft: "написане", count: 1 });

    expect(await step(store, "/start")).toBe(false);
    expect(store.ctx.user?.admin_dialog_text).toBe("написане");
  });
});
