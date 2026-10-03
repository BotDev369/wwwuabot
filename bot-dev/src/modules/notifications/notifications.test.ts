/**
 * Сповіщення — **що людина побачить у Telegram**.
 *
 * Два файли модуля не мали тестів: підстановку змінних у шаблон і кеш
 * topic_id у форумі. Обидва ламаються тихо: у шаблоні залишається `${...}`,
 * а повідомлення йде в чужий топик — і ніхто про це не дізнається, бо
 * «повідомлення відправилося».
 *
 * @module bot-dev/src/modules/notifications/notifications.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../shared/types/env";
import { buildTemplateContext, renderTemplate } from "./template-engine";
import { getOrCreateTopic } from "./topic-manager";

const USER_ID = 777;
const CHAT_A = "-100111";
const CHAT_B = "-100222";

/** Контекст із людиною та симулятором `createForumTopic`. */
function context(
  user: Record<string, unknown> = {},
  options: { topics?: Record<string, number>; fail?: boolean; threadId?: number } = {},
) {
  const created: { chatId: string; name: string }[] = [];
  const api = {
    createForumTopic: vi.fn(async (chatId: string, name: string) => {
      created.push({ chatId, name });
      if (options.fail) throw new Error("Telegram недоступний");
      return { message_thread_id: options.threadId ?? 55 };
    }),
  };
  const from = { id: USER_ID, first_name: "Оля", last_name: "К", username: "olya" };
  const ctx = {
    api,
    from,
    user: {
      user_id: USER_ID,
      topics: options.topics ? JSON.stringify(options.topics) : undefined,
      ...user,
    },
  } as unknown as AppContext;
  return { ctx, created, api };
}

/** Що лежить у кеші `user.topics` після виклику. */
function cachedTopics(ctx: AppContext): Record<string, number> {
  const raw = (ctx.user as unknown as { topics?: string }).topics;
  return raw ? (JSON.parse(raw) as Record<string, number>) : {};
}

describe("підстановка в шаблон", () => {
  it("міняє змінні на значення контексту", () => {
    const text = renderTemplate("Вітаємо, ${user_name}! Ціна: ${cart_total} грн", {
      user_name: "Оля",
      cart_total: 250,
    });
    expect(text).toBe("Вітаємо, Оля! Ціна: 250 грн");
  });

  it("⛔ невідома й порожня змінна дають порожній текст, а не «undefined»", () => {
    // `${user_id}` у живому повідомленні виглядає як збій шаблонізатора, а
    // «undefined» у листуванні з людиною — це непристойно.
    const text = renderTemplate("[${немає}][${user_id}]", {});
    expect(text).toBe("[][]");
    expect(text).not.toContain("undefined");
  });

  it("⛔ не ламається на '${' без закриття", () => {
    expect(renderTemplate("ціна ${", { a: 1 })).toBe("ціна ${");
  });
});

describe("контекст для шаблонів", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T09:05:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("збирає ім'я, username і дату з контексту", () => {
    const { ctx } = context();
    const built = buildTemplateContext(ctx);
    expect(built.user_name).toBe("Оля К");
    expect(built.user_username).toBe("@olya");
    expect(built.datetime).toBe("04.03.2026 09:05");
    expect(built.user_id).toBe(USER_ID);
  });

  it("⛔ відсутні Telegram-поля не дають «undefined» у листуванні", () => {
    const ctx = { env: {}, from: { id: 5 }, user: { user_id: 5 } } as unknown as AppContext;
    const built = buildTemplateContext(ctx);
    expect(built.user_name).toBe("...");
    expect(built.user_username).toBe("без username");
  });

  it("дані замовлення перекривають базові поля, але не зникають", () => {
    const { ctx } = context();
    const built = buildTemplateContext(ctx, { cart_total: 300, order_id: 9 });
    expect(built.cart_total).toBe(300);
    expect(built.order_id).toBe(9);
    expect(built.user_name).toBe("Оля К");
  });
});

describe("топики форуму", () => {
  it("нового топика створює, кешує й піднімає userDirty", async () => {
    const { ctx, created, api } = context();

    const topicId = await getOrCreateTopic(ctx, "main", CHAT_A);

    expect(topicId).toBe(55);
    expect(api.createForumTopic).toHaveBeenCalledTimes(1);
    expect(created[0].chatId).toBe(CHAT_A);
    expect(created[0].name).toContain("@olya");
    expect(cachedTopics(ctx)).toEqual({ main: 55 });
    expect(ctx.userDirty).toBe(true);
  });

  it("⛔ наявний topic_id не створює другого топику", async () => {
    const { ctx, api } = context({}, { topics: { main: 99 } });

    expect(await getOrCreateTopic(ctx, "main", CHAT_A)).toBe(99);
    expect(api.createForumTopic).not.toHaveBeenCalled();
    expect(ctx.userDirty).toBeUndefined();
  });

  it("⛔ битий topics JSON не ламає створення — кеш починається з нуля", async () => {
    const ctx = {
      api: { createForumTopic: vi.fn(async () => ({ message_thread_id: 7 })) },
      from: { id: USER_ID, first_name: "Оля", username: "olya" },
      user: { user_id: USER_ID, topics: "{це не json" },
    } as unknown as AppContext;

    expect(await getOrCreateTopic(ctx, "main", CHAT_A)).toBe(7);
    expect(cachedTopics(ctx)).toEqual({ main: 7 });
  });

  it("⛔ помилка Telegram повертає null і не пише у кеш", async () => {
    const { ctx } = context({}, { fail: true });

    expect(await getOrCreateTopic(ctx, "main", CHAT_A)).toBeNull();
    expect(cachedTopics(ctx)).toEqual({});
    expect(ctx.userDirty).toBeUndefined();
  });

  it("⚠️ кеш не враховує групу: той самий ключ у іншій групі поверне чужий топик", async () => {
    // Відома межа, а не баг, який треба ховати: `topics` ключується лише
    // `groupKey`, тому якщо ключ групи переїде в інший форум, повідомлення
    // піде в топік попередньої групи. Поки що топік на людину один.
    const { ctx, api } = context({}, { topics: { main: 99 } });

    expect(await getOrCreateTopic(ctx, "main", CHAT_B)).toBe(99);
    expect(api.createForumTopic).not.toHaveBeenCalled();
  });
});
