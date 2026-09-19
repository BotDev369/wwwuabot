/**
 * Екран запрошення — те, що бачить людина з першого переходу за лінком.
 *
 * Перевіряємо три речі, кожна з яких ламається мовчки:
 *
 * 1. **Кнопка веде в розмову з тим, хто запросив.** Адреса складається зі
 *    спільного `messagesPeerPath`, і помилка тут веде не в помилку, а в
 *    порожній список — тобто виглядає як «щось не завантажилось».
 * 2. **Ім'я — з ланцюга підписів продукту** (ім'я на платформі → Telegram):
 *    та сама людина мусить зватися однаково в боті й у розмові.
 * 3. **Без адреси платформи екрана немає.** Вітання без єдиної дії — глухий
 *    кут; краще головна, як було раніше.
 *
 * @module bot-dev/src/modules/contacts/invite-screen.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../shared/types/env";
import { showInviteScreen } from "./invite-screen";

const OWNER = 4242;
const PLATFORM = "https://app.example.com";

/** Рядок `users`, яким база відповідає на запит імені. */
interface InviterRow {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  platform_username: string | null;
}

/** Контекст із самою базою: рендеру тут не потрібно нічого, крім `ctx.screen`. */
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
  const env = {
    DB: db,
    WEB_PLATFORM_URL: options.url ?? PLATFORM,
    CLOUDINARY_CLOUD_NAME: "ddoumoe5n",
  };
  return { env, screen: undefined } as unknown as AppContext;
}

const FULL: InviterRow = {
  user_id: OWNER,
  first_name: "Сергій",
  last_name: "Дискант",
  username: "serg",
  platform_username: "karas",
};

// `getPhoto` перевіряє банер запитом — у тесті ця мережа ні до чого.
afterEach(() => {
  vi.unstubAllGlobals();
});

function stubNetwork(): void {
  vi.stubGlobal("fetch", async () => new Response(null, { status: 200 }));
}

describe("екран запрошення", () => {
  it("кнопка веде одразу в розмову з тим, хто запросив", async () => {
    stubNetwork();
    const ctx = context(FULL);

    expect(await showInviteScreen(ctx, OWNER)).toBe(true);
    expect(ctx.screen?.buttons).toEqual([
      [{ text: "Відкрити чат", web_app: { url: `${PLATFORM}/messages?peer=${OWNER}` } }],
    ]);
  });

  it("називає того, хто запросив, як його знає продукт", async () => {
    stubNetwork();
    const ctx = context(FULL);

    await showInviteScreen(ctx, OWNER);
    expect(ctx.screen?.caption.top).toContain("<b>@karas</b>");
    expect(ctx.screen?.caption.top).toContain("запрошує вас до конфіденційної бесіди");
  });

  it("без імені на платформі лишається Telegram-хендл, і лише потім ім'я", async () => {
    stubNetwork();
    const withoutPlatform = context({ ...FULL, platform_username: null });
    await showInviteScreen(withoutPlatform, OWNER);
    expect(withoutPlatform.screen?.caption.top).toContain("<b>@serg</b>");

    const telegramOnly = context({ ...FULL, platform_username: null, username: null });
    await showInviteScreen(telegramOnly, OWNER);
    expect(telegramOnly.screen?.caption.top).toContain("<b>Сергій Дискант</b>");
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
    expect(ctx.screen?.caption.top).toContain("&lt;b&gt;не&lt;/b&gt;");
    expect(ctx.screen?.caption.top).not.toContain("<b>не</b>");
  });

  it("база недоступна — вітання все одно є, разом із кнопкою", async () => {
    stubNetwork();
    const ctx = context(null, { fail: true });

    expect(await showInviteScreen(ctx, OWNER)).toBe(true);
    expect(ctx.screen?.buttons[0][0].web_app?.url).toContain(`peer=${OWNER}`);
  });

  it("без людини в базі вітання обходиться без імені, а не називає її вигадкою", async () => {
    stubNetwork();
    const ctx = context(null);

    await showInviteScreen(ctx, OWNER);
    expect(ctx.screen?.caption.top).toContain("Вас запрошують");
    expect(ctx.screen?.caption.top).not.toContain("Невідомий");
  });

  it("⛔ без адреси платформи екрана немає: кнопку скласти нічим", async () => {
    stubNetwork();
    const ctx = context(FULL, { url: "" });

    // Роутер на `false` показує головну — тобто поводиться як до цього екрана.
    expect(await showInviteScreen(ctx, OWNER)).toBe(false);
    expect(ctx.screen).toBeUndefined();
  });

  it("вітання не стає сторінкою контенту: у нього немає `web_path`", async () => {
    stubNetwork();
    const ctx = context(FULL);

    await showInviteScreen(ctx, OWNER);
    // Інакше рендер додав би другу кнопку («Відкрити сторінку») на той самий екран.
    expect(ctx.screen?.web_path).toBeUndefined();
  });
});
