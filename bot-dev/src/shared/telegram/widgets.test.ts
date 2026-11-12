/**
 * Транспорт Bot API 10.4: адреси методів, тіло й розбір помилки.
 *
 * @module bot-dev/src/shared/telegram/widgets.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { answerWidgetQuery, editMessageWidgetData, sendRichMessage, sendWidget } from "./widgets";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stub(payload: unknown) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify(payload), { status: 200 });
  });
  return calls;
}

describe("віджети", () => {
  it("sendWidget везе html, підпис і дозвіл запитів", async () => {
    const calls = stub({ ok: true, result: { message_id: 5, widget: { id: "w" } } });

    const sent = await sendWidget("token", {
      chatId: 7,
      html: "<b>x</b>",
      caption: "підпис",
      chatData: "{}",
      allowQueries: true,
    });

    expect(calls[0].url).toBe("https://api.telegram.org/bottoken/sendWidget");
    expect(calls[0].body).toEqual({
      chat_id: 7,
      html: "<b>x</b>",
      caption: "підпис",
      chat_data: "{}",
      allow_queries: true,
    });
    expect(sent.message_id).toBe(5);
  });

  it("rich, відповідь і правка стану йдуть своїми методами", async () => {
    const calls = stub({ ok: true, result: true });

    await sendRichMessage("token", 7, "<b>rich</b>");
    await answerWidgetQuery("token", "q1", "ok");
    await editMessageWidgetData("token", 7, 9, "{}");

    expect(calls.map((call) => call.url.split("/").pop())).toEqual([
      "sendRichMessage",
      "answerWidgetQuery",
      "editMessageWidgetData",
    ]);
    expect(calls[1].body).toEqual({ widget_query_id: "q1", data: "ok" });
    expect(calls[2].body).toEqual({ chat_id: 7, message_id: 9, chat_data: "{}" });
  });

  it("⛔ помилка API стає винятком із кодом", async () => {
    stub({ ok: false, error_code: 400, description: "HTML too large" });

    await expect(sendWidget("token", { chatId: 7, html: "<b>x</b>" })).rejects.toThrow(
      "HTML too large",
    );
  });
});
