/**
 * Екран запрошення: кнопка веде в розмову з тим, хто запросив, ім'я береться з
 * ланцюга підписів продукту (без `@`), без адреси платформи екрана немає.
 *
 * @module bot-dev/src/modules/contacts/invite-screen.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../shared/types/env";
import { showInviteScreen } from "./invite-screen";

const OWNER = 4242;
const PLATFORM = "https://app.example.com";

interface InviterRow {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  platform_username: string | null;
}

interface SentPhoto {
  caption?: string;
  reply_markup?: { inline_keyboard: { text: string; web_app?: { url: string } }[][] };
}

function context(row: InviterRow | null, options: { fail?: boolean; url?: string } = {}) {
  const db = {
    prepare: () => ({
      bind: () => ({
        first: async () => {
          if (options.fail) throw new Error("D1 недоступна");
          return row;
        },
      }),
    }),
  };
  const sent: SentPhoto[] = [];
  const api = {
    sendPhoto: async (_chat: number, _photo: string, options: SentPhoto) => {
      sent.push(options);
      return { message_id: 10 };
    },
    deleteMessages: async () => true,
  };
  const env = {
    DB: db,
    WEB_PLATFORM_URL: options.url ?? PLATFORM,
    CLOUDINARY_CLOUD_NAME: "ddoumoe5n",
  };
  return { env, api, chat: { id: 1, type: "private" }, sent } as unknown as AppContext & {
    sent: SentPhoto[];
  };
}

const FULL: InviterRow = {
  user_id: OWNER,
  first_name: "Сергій",
  last_name: "Дискант",
  username: "serg",
  platform_username: "karas",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubNetwork(): void {
  vi.stubGlobal("fetch", async () => new Response(null, { status: 200 }));
}

function caption(ctx: AppContext & { sent: SentPhoto[] }): string {
  return ctx.sent[0]?.caption ?? "";
}

describe("екран запрошення", () => {
  it("кнопка веде одразу в розмову з тим, хто запросив", async () => {
    stubNetwork();
    const ctx = context(FULL);

    expect(await showInviteScreen(ctx, OWNER)).toBe(true);
    expect(ctx.sent[0].reply_markup?.inline_keyboard[0][0]).toEqual({
      text: "Відкрити чат",
      web_app: { url: `${PLATFORM}/messages?peer=${OWNER}` },
    });
  });

  it("називає того, хто запросив, як його знає продукт, і без `@`", async () => {
    stubNetwork();
    const ctx = context(FULL);

    await showInviteScreen(ctx, OWNER);
    expect(caption(ctx)).toContain("<b>karas</b>");
    expect(caption(ctx)).toContain("запрошує вас до конфіденційної бесіди");
    expect(caption(ctx)).not.toContain("@karas");
  });

  it("без імені на платформі лишається Telegram-хендл, і лише потім ім'я", async () => {
    stubNetwork();
    const withoutPlatform = context({ ...FULL, platform_username: null });
    await showInviteScreen(withoutPlatform, OWNER);
    expect(caption(withoutPlatform)).toContain("<b>@serg</b>");

    const telegramOnly = context({ ...FULL, platform_username: null, username: null });
    await showInviteScreen(telegramOnly, OWNER);
    expect(caption(telegramOnly)).toContain("<b>Сергій Дискант</b>");
  });

  it("ім'я екранується: підпис іде з `parse_mode: HTML`", async () => {
    stubNetwork();
    const ctx = context({
      ...FULL,
      first_name: "<b>не</b> ім'я",
      platform_username: null,
      username: null,
    });

    await showInviteScreen(ctx, OWNER);
    expect(caption(ctx)).toContain("&lt;b&gt;не&lt;/b&gt;");
    expect(caption(ctx)).not.toContain("<b>не</b>");
  });

  it("база недоступна — вітання все одно є, разом із кнопкою", async () => {
    stubNetwork();
    const ctx = context(null, { fail: true });

    expect(await showInviteScreen(ctx, OWNER)).toBe(true);
    expect(ctx.sent[0].reply_markup?.inline_keyboard[0][0].web_app?.url).toContain(`peer=${OWNER}`);
  });

  it("без людини в базі вітання обходиться без імені", async () => {
    stubNetwork();
    const ctx = context(null);

    await showInviteScreen(ctx, OWNER);
    expect(caption(ctx)).toContain("Вас запрошують");
    expect(caption(ctx)).not.toContain("Невідомий");
  });

  it("⛔ без адреси платформи екрана немає: кнопку скласти нічим", async () => {
    stubNetwork();
    const ctx = context(FULL, { url: "" });

    expect(await showInviteScreen(ctx, OWNER)).toBe(false);
    expect(ctx.sent).toHaveLength(0);
  });
});
