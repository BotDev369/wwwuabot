/** Regression tests for the Telegram screen keyboard builder. */

import { describe, expect, it, vi } from "vitest";
import { ACCOUNT_PATH, FAVORITES_PATH, SERVICES_PATH } from "@wwwuabot/shared/app/routes";
import type { AppContext, ScreenState } from "../types/env";
import {
  buildCaption,
  buildPlatformRow,
  buildScreenButtons,
  buildWebAppUrl,
  sendOrEditLiveMessage,
} from "./screen";

const PLATFORM = "https://app.example.com";

describe("buildWebAppUrl", () => {
  it("joins the configured platform origin with the current web route", () => {
    expect(buildWebAppUrl("https://app.example.com/", "/mydate/today")).toBe(
      "https://app.example.com/mydate/today",
    );
  });

  it("does not invent a URL when the platform is not configured", () => {
    expect(buildWebAppUrl(undefined, "/about")).toBeNull();
    expect(buildWebAppUrl("", "/about")).toBeNull();
  });

  it("points the home page at the platform root", () => {
    // `/start` без параметра веде на головну (`slug = ""`), а її веб-шлях — `/`.
    expect(buildWebAppUrl("https://app.example.com", "/")).toBe("https://app.example.com/");
    expect(buildWebAppUrl("https://app.example.com/", "/")).toBe("https://app.example.com/");
  });
});

describe("buildScreenButtons", () => {
  const screen = {
    buttons: [[{ text: "Далі", callback_data: "next" }]],
    web_path: "/mydate/1980-03-03/today",
  } as const;

  it("keeps saved buttons and appends one web_app button", () => {
    const buttons = buildScreenButtons(screen, "https://app.example.com");

    expect(buttons[0]).toEqual([{ text: "Далі", callback_data: "next" }]);
    expect(buttons[1]).toEqual([
      {
        text: "Відкрити сторінку",
        web_app: { url: "https://app.example.com/mydate/1980-03-03/today" },
      },
    ]);
  });

  it("does not duplicate an already saved button", () => {
    const url = "https://app.example.com/about";
    const buttons = buildScreenButtons(
      { buttons: [[{ text: "Відкрити", web_app: { url } }]], web_path: "/about" },
      "https://app.example.com",
    );

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toEqual([{ text: "Відкрити", web_app: { url } }]);
  });

  it("returns a copy of saved buttons when the URL is missing", () => {
    const buttons = buildScreenButtons(screen, undefined);

    expect(buttons).toEqual(screen.buttons);
    expect(buttons).not.toBe(screen.buttons);
    expect(buttons[0]).not.toBe(screen.buttons[0]);
  });

  it("adds one button on the home page without dropping saved ones", () => {
    const buttons = buildScreenButtons(
      { buttons: [[{ text: "Дати", callback_data: "mydate" }]], web_path: "/" },
      "https://web-platform-dev.diskomate.workers.dev",
    );

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toEqual([{ text: "Дати", callback_data: "mydate" }]);
    expect(buttons[1]).toEqual([
      {
        text: "Відкрити сторінку",
        web_app: { url: "https://web-platform-dev.diskomate.workers.dev/" },
      },
    ]);
  });
});

describe("перший екран: один рядок екранів платформи", () => {
  const landing = {
    buttons: [[{ text: "МоїДати", callback_data: "mydate" }]],
    web_path: "/",
    landing: true,
  } as const;

  it("⛔ кнопок сторінки на ньому немає — вони ведуть у сценарії, яких ще немає", () => {
    const buttons = buildScreenButtons(landing, PLATFORM);

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveLength(3);
    expect(buttons[0].map((b) => b.text)).toEqual(["👤", "👍", "🧰"]);
  });

  it("⛔ три кнопки ведуть на ті самі адреси, що й пункти футера платформи", () => {
    const buttons = buildScreenButtons(landing, PLATFORM);

    expect(buttons[0].map((b) => b.web_app?.url)).toEqual([
      `${PLATFORM}${ACCOUNT_PATH}`,
      `${PLATFORM}${FAVORITES_PATH}`,
      `${PLATFORM}${SERVICES_PATH}`,
    ]);
  });

  it("⛔ без адреси платформи рядка немає — Telegram не прийме web_app без url", () => {
    expect(buildPlatformRow(undefined)).toBeNull();
    expect(buildScreenButtons(landing, undefined)).toEqual([]);
  });
});

/**
 * Надсилання екрана: **нове повідомлення замість редагування** і знесення
 * старого. Перевіряємо те, що ламається тихо: екран, який не пішов, мусить
 * повернути `false` (роутер тоді не ставить прапорців), а знесення старого
 * лишається необов'язковим — його провал не робить надсилання невдалим.
 */
describe("надсилання екрана", () => {
  const PHOTO = "https://cdn.example.com/banner.png";
  const PLAIN: Omit<ScreenState, "photo_url"> = {
    slug: "dateanalysis",
    caption: { top: "Дати", mid: "   ", bot: "1980" },
    buttons: [[{ text: "Далі", callback_data: "next" }]],
    web_path: "/dateanalysis/1980",
  };
  const RICH: Omit<ScreenState, "photo_url"> = {
    slug: "card",
    caption: {},
    buttons: [],
    rich_message: true,
    rich_data: [{ type: "paragraph" }],
  };

  function makeCtx(
    screen: Omit<ScreenState, "photo_url">,
    overrides: { userMessageId?: number | undefined; message?: boolean } = {},
  ) {
    const api = {
      sendPhoto: vi.fn(async () => ({ message_id: 42 })),
      sendRichMessage: vi.fn(async () => ({ message_id: 43 })),
      raw: { deleteMessages: vi.fn(async () => ({})) },
    };
    const ctx = {
      chat: { id: 777 },
      user: { user_id: 1, message_id: overrides.userMessageId ?? 10 },
      env: { WEB_PLATFORM_URL: PLATFORM, CLOUDINARY_CLOUD_NAME: "demo" },
      api,
      screen: { ...screen, photo_url: PHOTO },
    } as unknown as AppContext;
    if (overrides.message !== false) {
      (ctx as { message?: { message_id: number } }).message = { message_id: 11 };
    }
    return { ctx, api };
  }

  it("надсилає екран фото і зносить старе повідомлення", async () => {
    const { ctx, api } = makeCtx(PLAIN);

    expect(await sendOrEditLiveMessage(ctx)).toBe(true);
    expect(api.sendPhoto).toHaveBeenCalledWith(
      777,
      PHOTO,
      expect.objectContaining({ caption: "Дати\n───────\n1980", parse_mode: "HTML" }),
    );
    expect(api.raw.deleteMessages).toHaveBeenCalledWith({ chat_id: 777, message_ids: [10, 11] });
    expect(ctx.user?.message_id).toBe(42);
    expect(ctx.userDirty).toBe(true);
    expect(ctx.liveMessageSent).toBe(true);
  });

  it("rich-екран надсилається своїм API, а не фото", async () => {
    const { ctx, api } = makeCtx(RICH);

    expect(await sendOrEditLiveMessage(ctx)).toBe(true);
    expect(api.sendRichMessage).toHaveBeenCalledWith(
      777,
      { blocks: [{ type: "paragraph" }] },
      expect.anything(),
    );
    expect(api.sendPhoto).not.toHaveBeenCalled();
    expect(ctx.user?.message_id).toBe(43);
  });

  it("⛔ rich_message без rich_data нічого не надсилає", async () => {
    const { ctx, api } = makeCtx({ ...RICH, rich_data: null });

    expect(await sendOrEditLiveMessage(ctx)).toBe(false);
    expect(api.sendPhoto).not.toHaveBeenCalled();
    expect(api.sendRichMessage).not.toHaveBeenCalled();
    expect(ctx.liveMessageSent).toBeUndefined();
  });

  it("⛔ без екрана працювати нема з чим", async () => {
    const { ctx } = makeCtx(PLAIN);
    delete (ctx as { screen?: unknown }).screen;

    expect(await sendOrEditLiveMessage(ctx)).toBe(false);
  });

  it("⛔ збій надсилання не вдає успіх", async () => {
    const photo = makeCtx(PLAIN);
    photo.api.sendPhoto.mockRejectedValue(new Error("boom"));
    expect(await sendOrEditLiveMessage(photo.ctx)).toBe(false);

    const rich = makeCtx(RICH);
    rich.api.sendRichMessage.mockRejectedValue(new Error("boom"));
    expect(await sendOrEditLiveMessage(rich.ctx)).toBe(false);
  });

  it("знесення старого не обов'язкове: його провал не робить надсилання невдалим", async () => {
    const { ctx, api } = makeCtx(PLAIN);
    api.raw.deleteMessages.mockRejectedValue(new Error("nope"));

    expect(await sendOrEditLiveMessage(ctx)).toBe(true);
  });

  it("зносити нічого, коли лишилося тільки надіслане", async () => {
    // Той самий номер у старого й нового повідомлення (і немає вхідного) —
    // знімати нічого, і зайвий виклик Telegram тут був би помилкою.
    const { ctx, api } = makeCtx(PLAIN, { userMessageId: 42, message: false });

    expect(await sendOrEditLiveMessage(ctx)).toBe(true);
    expect(api.raw.deleteMessages).not.toHaveBeenCalled();
  });
});

/**
 * Підпис екрана: непорожні блоки з'єднуються роздільником, порожні — зникають,
 * а не лишають подвійну лінію.
 */
describe("підпис екрана", () => {
  it("збирає непорожні блоки через роздільник", () => {
    expect(buildCaption({ top: "Дати", mid: "   ", bot: "1980" })).toBe("Дати\n───────\n1980");
  });

  it("з порожнього підпису не робить лінію", () => {
    expect(buildCaption({})).toBe("");
    expect(buildCaption({ top: "  ", mid: "", bot: "   " })).toBe("");
  });
});
