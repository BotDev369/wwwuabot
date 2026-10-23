/**
 * Журнал дій бота: подія пишеться після обробки, помилка не валить оновлення.
 *
 * Перевіряється саме **межа**: успішна дія лишає `status=ok`, виняток —
 * `status=error` і летить далі, а недоступна D1 не забирає екран у людини.
 *
 * @module bot-dev/src/modules/logging/logging.middleware.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext, Env } from "../../shared/types/env";

const record = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@wwwuabot/shared/database/user-events", () => ({ recordUserEvent: record }));

const { comprehensiveLogger } = await import("./logging.middleware");

const env = { DB: {} } as Env;

/** Контекст із мінімумом, який читає `buildUserEvent`. */
function context(): AppContext {
  return { from: { id: 42 }, message: { text: "/start" }, env } as unknown as AppContext;
}

beforeEach(() => {
  record.mockClear();
});

describe("журнал подій бота", () => {
  it("пише дію зі status=ok після обробки", async () => {
    await comprehensiveLogger(context(), async () => undefined);

    expect(record).toHaveBeenCalledWith(
      env.DB,
      expect.objectContaining({ userId: 42, surface: "bot", kind: "command", action: "/start" }),
    );
  });

  it("виняток пише помилку й летить далі", async () => {
    const fail = new Error("handler failed");
    await expect(
      comprehensiveLogger(context(), async () => {
        throw fail;
      }),
    ).rejects.toBe(fail);

    expect(record).toHaveBeenCalledWith(env.DB, expect.objectContaining({ status: "error" }));
  });

  it("недоступна D1 не забирає відповідь у людини", async () => {
    record.mockRejectedValueOnce(new Error("no such table: user_events"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(comprehensiveLogger(context(), async () => undefined)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
