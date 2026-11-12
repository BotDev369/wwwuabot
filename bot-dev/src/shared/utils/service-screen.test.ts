/**
 * Службовий екран: фото з підписом і inline-кнопками, заміна попереднього.
 *
 * @module bot-dev/src/shared/utils/service-screen.test
 */

import { describe, expect, it } from "vitest";
import type { AppContext } from "../types/env";
import { buildWebAppUrl, sendServiceScreen } from "./service-screen";

function context(sendFails = false) {
  const sent: unknown[] = [];
  const deleted: number[][] = [];
  const ctx = {
    chat: { id: 5, type: "private" },
    user: { user_id: 7, message_id: 3 },
    api: {
      sendPhoto: async (_chat: number, _photo: string, options: unknown) => {
        if (sendFails) throw new Error("boom");
        sent.push(options);
        return { message_id: 9 };
      },
      deleteMessages: async (_chat: number, ids: number[]) => {
        deleted.push(ids);
        return true;
      },
    },
  } as unknown as AppContext;
  return { ctx, sent, deleted };
}

describe("service screen", () => {
  it("складає адресу Mini App від базового URL", () => {
    expect(buildWebAppUrl("https://app.example.com", "/messages?peer=1")).toBe(
      "https://app.example.com/messages?peer=1",
    );
    expect(buildWebAppUrl(undefined, "/x")).toBeNull();
    expect(buildWebAppUrl("https://app.example.com", undefined)).toBeNull();
  });

  it("шле фото з підписом і кнопками та зносить попереднє", async () => {
    const { ctx, sent, deleted } = context();
    const ok = await sendServiceScreen(ctx, {
      photoUrl: "https://img",
      caption: "<b>привіт</b>",
      buttons: [[{ text: "Далі", callback_data: "next" }]],
    });

    expect(ok).toBe(true);
    expect(sent[0]).toEqual({
      caption: "<b>привіт</b>",
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "Далі", callback_data: "next" }]] },
    });
    expect(deleted).toEqual([[3]]);
    expect(ctx.user?.message_id).toBe(9);
  });

  it("⛔ помилка відправки — false", async () => {
    const { ctx } = context(true);
    expect(await sendServiceScreen(ctx, { photoUrl: "x", caption: "y", buttons: [] })).toBe(false);
  });

  it("без chat нічого не шле", async () => {
    const { ctx } = context();
    (ctx as { chat?: unknown }).chat = undefined;
    expect(await sendServiceScreen(ctx, { photoUrl: "x", caption: "y", buttons: [] })).toBe(false);
  });
});
