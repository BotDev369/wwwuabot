/**
 * Клієнт повідомлень: **які саме шляхи й тіла він складає**.
 *
 * Те, що тут перевіряється, не бачить ні компілятор, ні типізація: шлях — це
 * рядок, і `send` на `/messages/send` замість `/api/messages/send` компілюється
 * бездоганно, а в рантаймі дає 404. Друга дрібниця — **автор**: його в запитах
 * немає й бути не може, бо його бере сервер із підписаного `initData`
 * (`api-dev/src/shared/identity.ts`).
 *
 * @module @wwwuabot/shared/messages/api.test
 */

import { describe, expect, it } from "vitest";
import { createMessagesApi } from "./api";

interface Call {
  path: string;
  init?: RequestInit;
}

/** Транспорт-заглушка: запам'ятовує виклик і віддає задану відповідь. */
function makeTransport(response: unknown): { calls: Call[]; fetch: () => never } {
  const calls: Call[] = [];
  const transport = async <T>(path: string, init?: RequestInit): Promise<T> => {
    calls.push({ path, init });
    return response as T;
  };
  return { calls, fetch: transport as unknown as () => never };
}

describe("createMessagesApi", () => {
  it("список — той самий шлях, і без жодного «від кого»", async () => {
    const transport = makeTransport({ ok: true, conversations: [] });
    const api = createMessagesApi(transport.fetch as never, "/api/messages");

    await api.list();

    expect(transport.calls[0].path).toBe("/api/messages");
    expect(transport.calls[0].init).toBeUndefined();
  });

  it("розмова питає `peer`, а старіші — ще й `before`", async () => {
    const transport = makeTransport({ ok: true, messages: [] });
    const api = createMessagesApi(transport.fetch as never, "/api/messages");

    await api.thread(42);
    expect(transport.calls[0].path).toBe("/api/messages/thread?peer=42");

    await api.thread(42, 100);
    expect(transport.calls[1].path).toBe("/api/messages/thread?peer=42&before=100");
  });

  it("надсилання несе `peer` і тіло, і повертає підтверджений рядок", async () => {
    const message = { id: 1, senderId: 7, body: "привіт", createdAt: "", readAt: null };
    const transport = makeTransport({ ok: true, message });
    const api = createMessagesApi(transport.fetch as never, "/api/messages");

    const sent = await api.send(42, "привіт");

    expect(transport.calls[0].path).toBe("/api/messages/send");
    expect(transport.calls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(transport.calls[0].init?.body))).toEqual({
      peer: 42,
      body: "привіт",
    });
    expect(sent).toEqual(message);
  });

  it("«сервер не підтвердив» — це `null`, а не порожня бульбашка", async () => {
    const transport = makeTransport({ ok: true });
    const api = createMessagesApi(transport.fetch as never, "/api/messages");

    expect(await api.send(42, "привіт")).toBeNull();
  });

  it("позначення прочитаним віддає число, а відмова кидає причину", async () => {
    const ok = makeTransport({ ok: true, read: 3 });
    expect(await createMessagesApi(ok.fetch as never, "/api/messages").markRead(42)).toBe(3);

    const failed = makeTransport({ ok: false, error: "Розмови з цією людиною немає" });
    await expect(
      createMessagesApi(failed.fetch as never, "/api/messages").markRead(42),
    ).rejects.toThrow("Розмови з цією людиною немає");
  });

  it("бейдж — число; порожня відповідь дає нуль, а не `undefined`", async () => {
    const transport = makeTransport({ ok: true, unread: 4 });
    expect(await createMessagesApi(transport.fetch as never, "/api/messages").badge()).toBe(4);

    const empty = makeTransport({ ok: true });
    expect(await createMessagesApi(empty.fetch as never, "/api/messages").badge()).toBe(0);
  });
});
