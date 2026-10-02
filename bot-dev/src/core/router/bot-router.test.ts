/**
 * Порядок «показав — потім знести» — тести роутера.
 *
 * Тут ловиться те, що ламається найтихіше: повідомлення зникає, а на його
 * місці так і нічого не з'явилося. Людина натискає «Старт», бачить порожнечу й
 * не розуміє, що це помилка. Тому правило одне: **спершу бот щось показує, і
 * лише потім зникає те, що його викликало**.
 *
 * @module bot-dev/src/core/router/bot-router.test
 */

import { describe, expect, it } from "vitest";
import type { AppContext } from "../../shared/types/env";
import { buildScreenButtons } from "../../shared/utils/screen";
import { botRouter } from "./bot-router";

/** Telegram-id власника — його виняток із допуску діє (`ADMIN_TELEGRAM_ID`). */
const OWNER = 372567448;

/** Що бачив би користувач із чату: що видалено і що надіслано. */
interface Store {
  deleted: number[];
  sent: string[];
  ctx: AppContext;
  /** Чи роутер передав прапорець «знести після показу». */
  dropIncomingAfterRender: () => boolean;
}

/**
 * Рядок `scenarios` для тесту: підпис і одна кнопка сценарію.
 *
 * Бота це цікавить саме тим, що в ньому є кнопка сторінки — на першому екрані
 * її бути не повинно, а на сторінці за діплінком повинна.
 */
function page(slug: string, title: string) {
  return {
    id: slug === "" ? 1 : 2,
    slug,
    title,
    photo_url: "https://cdn.example/banner.png",
    caption_top: "wwwuabot - соціально-ділова платформа",
    caption_mid: null,
    caption_bot: null,
    keyboard_type: "inline",
    buttons: JSON.stringify([[{ text: "МоїДати", callback_data: "mydate" }]]),
    awaits_input: null,
    input_path: null,
    input_next: null,
    price: null,
    qty_options: null,
    notify_groups: null,
    notify_template: null,
    rich_message: null,
    rich_data: null,
    page_data: null,
    template_key: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
  };
}

function chat(
  options: { userId?: number; text?: string; deniedFails?: boolean; pages?: string[] } = {},
): Store {
  const deleted: number[] = [];
  const sent: string[] = [];

  const api = {
    deleteMessage: async (_chatId: number, messageId: number) => {
      deleted.push(messageId);
      return true;
    },
    sendMessage: async (_chatId: number, text: string) => {
      if (options.deniedFails) throw new Error("chat is locked");
      sent.push(text);
      return { message_id: 500 };
    },
    deleteMessages: async () => true,
    editMessageReplyMarkup: async () => true,
    editMessageText: async () => true,
  };

  // Без `pages` таблиця порожня — тоді рендер нічого не показує: саме той
  // випадок, де видаляти не можна.
  const rows = (options.pages ?? []).map((slug) => page(slug, slug === "" ? "Головна" : slug));
  const content = rows.map(({ id, slug, title, photo_url }) => ({ id, slug, title, photo_url }));

  const db = {
    prepare: () => ({
      // Рядок сторінки беруть за адресою (`bind(slug).first`), перелік
      // контенту — без `bind` (`all`), тож дві різні відповіді.
      bind: (...values: unknown[]) => ({
        first: async () => rows.find((row) => row.slug === String(values[0])) ?? null,
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 0 } }),
      }),
      all: async () => ({ results: content }),
      first: async () => null,
      run: async () => ({ meta: { changes: 0 } }),
    }),
  };

  const ctx = {
    env: { DB: db, ADMIN_TELEGRAM_ID: String(OWNER), WEB_PLATFORM_URL: "https://p.example" },
    api,
    chat: { id: 42 },
    from: { id: options.userId ?? OWNER },
    message: { message_id: 99, text: options.text ?? "/start" },
    user: { user_id: options.userId ?? OWNER, message_id: 7 },
  } as unknown as AppContext;

  return {
    deleted,
    sent,
    ctx,
    dropIncomingAfterRender: () => ctx.dropIncomingAfterRender === true,
  };
}

describe("порядок видалення", () => {
  it("⛔ екран не знайдено — `/start` лишається, інакше воно просто зникне", async () => {
    const store = chat({ text: "/start" });

    await botRouter(store.ctx);

    // Сценарія немає, тож рендер нічого не показує (`ctx.screen` порожній), а
    // видалення повідомлення чекає саме на нього — інакше людина натиснула б
    // «Старт» і не отримала нічого.
    expect(store.ctx.screen).toBeUndefined();
    expect(store.dropIncomingAfterRender()).toBe(true);
    expect(store.deleted).not.toContain(99);
  });

  it("⛔ невідома команда зникає мовчки — ми нічого не показуємо і нічого не пояснюємо", async () => {
    const store = chat({ text: "/help" });

    await botRouter(store.ctx);

    expect(store.deleted).toContain(99);
    expect(store.sent).toHaveLength(0);
  });

  it("⛔ несподіваний текст без допуску зникає мовчки, без відмови", async () => {
    // Відмова вже стоїть у чаті екраном; друга та сама вона б лише заважала,
    // а її кнопка «Написати адміну» жила б на ненаписане повідомлення.
    const store = chat({ userId: 555, text: "а можна мені?" });

    await botRouter(store.ctx);

    expect(store.deleted).toContain(99);
    expect(store.sent).toHaveLength(0);
  });

  it("⛔ відмова не надіслалась — `/start` лишається, а не зникає в порожнечу", async () => {
    const store = chat({ userId: 555, text: "/start", deniedFails: true });

    await botRouter(store.ctx);

    expect(store.deleted).not.toContain(99);
  });

  it("відмова показалась — тоді `/start` зникає", async () => {
    const store = chat({ userId: 555, text: "/start" });

    await botRouter(store.ctx);

    // Порядок саме такий: спершу відмова, потім видалення. Навпаки — людина
    // натиснула «Старт» і опинилася в порожнечі.
    expect(store.sent).toHaveLength(1);
    expect(store.deleted).toContain(99);
  });
});

describe("перший екран — одне повідомлення", () => {
  it("⛔ `/start` без діплінка: під банером лише рядок екранів платформи, без кнопок сторінки", async () => {
    const store = chat({ text: "/start", pages: [""] });

    await botRouter(store.ctx);

    expect(store.ctx.screen?.landing).toBe(true);

    // Рівно один рядок кнопок на повідомленні: три емодзі. Кнопки сторінки
    // («МоїДати») тут немає, а другого повідомлення з клавіатурою роутер
    // більше не надсилає — `sent` лишається порожнім.
    const buttons = buildScreenButtons(store.ctx.screen!, "https://p.example");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].map((button) => button.text)).toEqual(["👤", "👍", "👥"]);
    expect(store.sent).toHaveLength(0);
  });

  it("діплінк — звичайна сторінка: її кнопки лишаються на місці", async () => {
    const store = chat({ text: "/start mydate", pages: ["", "mydate"] });

    await botRouter(store.ctx);

    // Сторінка за діплінком — не перший екран: її власні кнопки й далі
    // потрібні, бо це вхід у сценарій.
    expect(store.ctx.screen?.landing).toBe(false);
    expect(buildScreenButtons(store.ctx.screen!, "https://p.example")[0]).toEqual([
      { text: "МоїДати", callback_data: "mydate" },
    ]);
  });
});
