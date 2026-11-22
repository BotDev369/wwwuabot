import { describe, expect, it } from "vitest";
import {
  BOT_CHANNEL_PATH,
  plainTextToRichHtml,
  signBotChannel,
  verifyBotChannel,
} from "./bot-channel";

const SECRET = "test-secret";
const NOW = 1_700_000_000_000;
const BODY = JSON.stringify({ action: "edit", chatId: 7, messageId: 11, text: "нове" });

async function header(body = BODY, now = NOW): Promise<string> {
  return signBotChannel(SECRET, { method: "POST", path: BOT_CHANNEL_PATH, body, now });
}

async function verify(overrides: Record<string, unknown> = {}) {
  return verifyBotChannel(SECRET, {
    method: "POST",
    path: BOT_CHANNEL_PATH,
    body: BODY,
    header: await header(),
    now: NOW,
    ...overrides,
  });
}

describe("підписаний канал api-dev → bot", () => {
  it("приймає свіжий підпис із правильним тілом", async () => {
    expect(await verify()).toEqual({ ok: true });
  });

  it("чуже тіло, метод або шлях ламають підпис", async () => {
    expect(await verify({ body: `${BODY} ` })).toEqual({ ok: false, reason: "signature" });
    expect(await verify({ method: "PUT" })).toEqual({ ok: false, reason: "signature" });
    expect(await verify({ path: "/internal/other" })).toEqual({ ok: false, reason: "signature" });
  });

  it("старий підпис не приймається", async () => {
    const stale = await header(BODY, NOW - 61_000);
    expect(await verify({ header: stale })).toEqual({ ok: false, reason: "stale" });
  });

  it("без заголовка, зі сміттям і без секрету — відмова", async () => {
    expect(await verify({ header: null })).toEqual({ ok: false, reason: "missing" });
    expect(await verify({ header: "t=1,v1=zz" })).toEqual({ ok: false, reason: "malformed" });
    expect(
      await verifyBotChannel(undefined, {
        method: "POST",
        path: BOT_CHANNEL_PATH,
        body: BODY,
        header: await header(),
        now: NOW,
      }),
    ).toEqual({ ok: false, reason: "missing" });
  });

  it("текст адміна стає rich-HTML без живої розмітки", () => {
    expect(plainTextToRichHtml("Рядок 1\n<b>Рядок 2</b> & далі")).toBe(
      "<p>Рядок 1<br/>&lt;b&gt;Рядок 2&lt;/b&gt; &amp; далі</p>",
    );
  });
});
