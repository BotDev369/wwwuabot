/**
 * Споживач черги логів — що робити, коли віддавати логи нікуди.
 *
 * **Кинутий виняток тут — не помилка, а цикл.** Cloudflare ретраїть партію, яку
 * не підтвердили, тож `fetch(undefined)` перетворює кожен лог на вічне
 * завдання: черга росте, а в логах замість причини — «Invalid URL: undefined».
 * Тому відсутність адреси — привід **підтвердити** партію й сказати про це
 * в консоль.
 *
 * @module bot-dev/src/api/queue/queue.handler.test
 */

import { describe, expect, it, vi } from "vitest";
import type { MessageBatch } from "@cloudflare/workers-types";
import { handleQueue } from "./queue.handler";
import type { Env } from "../../shared/types/env";
import type { LogMessage } from "../../shared/types/log";

function batch(count = 2): MessageBatch<LogMessage> {
  return {
    messages: Array.from({ length: count }, (_, index) => ({
      body: { user_id: index, action: "test" },
    })),
  } as unknown as MessageBatch<LogMessage>;
}

describe("handleQueue", () => {
  it("без GAS_LOG_WEBHOOK_URL партія підтверджується, а не ретраїться вічно", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(handleQueue(batch(), {} as unknown as Env)).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("із заданою адресою логи таки їдуть", async () => {
    const fetchSpy = vi.fn(
      async (_url: string, _init?: { body?: string }) => new Response("ok", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await handleQueue(batch(3), {
      GAS_LOG_WEBHOOK_URL: "https://example.com/logs",
    } as unknown as Env);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)) as unknown[];
    expect(body).toHaveLength(3);

    vi.unstubAllGlobals();
  });
});
