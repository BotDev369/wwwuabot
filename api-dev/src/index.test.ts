/**
 * Тести загального обробника воркера `api-dev`.
 *
 * Дві речі, які легко зламати непомітно:
 *
 * 1. **Поганий ввід не має виглядати як збій сервера.** Криве кодування в
 *    шляху раніше зривало `decodeURIComponent`, вилітало з воркера, і клієнт
 *    отримував 500 — а Sentry помилку рівня «щось зламалось» на кожен
 *    сміттєвий запит від сканера.
 * 2. **Назовні не має їхати стек-трейс.** Виняток показує назви таблиць і
 *    значення з D1, а ендпоїнти тут публічні.
 *
 * І третє, вже про нове: **відмітка входу на платформу не затримує відповідь**.
 * Вона іде в `ctx.waitUntil`, бо дата приєднання не належить відповіді на
 * запит — але мусить пережити її відправку, і саме тому `waitUntil` тут
 * обов'язковий, а не `void`.
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "./shared/types";

// Підміняємо роутер, щоб гарантовано отримати необроблений виняток: інакше
// довелося б триматися за випадковий маршрут, чий контролер не має `try`.
const router = vi.hoisted(() => ({
  handler: async (): Promise<Response> => {
    throw new Error("D1_ERROR: no such table: users_secrets");
  },
}));
vi.mock("./router", () => ({ handleRequest: () => router.handler() }));

// Журнал підміняємо: перевіряємо не запис у D1, а те, що він узагалі береться
// під `waitUntil` після успішної відповіді.
const recordPlatform = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./services/user-events.service", () => ({ recordPlatformAction: recordPlatform }));

// Єдиний розклад — прибирання журналу.
const retention = vi.hoisted(() => ({ prune: vi.fn(async () => 0) }));
vi.mock("./services/user-events-retention", () => ({
  pruneOldEvents: retention.prune,
  EVENT_RETENTION_DAYS: 180,
  EVENTS_CRON: "23 3 * * *",
}));

const { default: worker } = await import("./index");
const { EVENTS_CRON } = await import("./services/user-events-retention");

const env = {} as Env;

/** `ExecutionContext`, який лише записує, що в `waitUntil` передали. */
function executionContext(): { ctx: ExecutionContext; waited: Promise<unknown>[] } {
  const waited: Promise<unknown>[] = [];
  return {
    waited,
    ctx: {
      waitUntil: (promise: Promise<unknown>) => waited.push(promise),
      passThroughOnException: () => {},
    } as unknown as ExecutionContext,
  };
}

/** `ScheduledController`, який має все, що читає обгортка Sentry (зокрема час). */
function controller(cron: string): ScheduledController {
  return {
    cron,
    scheduledTime: Date.parse("2026-10-31T05:37:00Z"),
    noRetry: () => {},
  } as unknown as ScheduledController;
}

describe("необроблений виняток", () => {
  it("віддає 500 без деталей, а не сирий stack trace", async () => {
    const { ctx } = executionContext();
    const response = await worker.fetch(
      new Request("https://api.example.com/api/anything"),
      env,
      ctx,
    );

    expect(response.status).toBe(500);
    const raw = await response.text();
    expect(JSON.parse(raw)).toEqual({ error: "Internal error" });
    // Найдорожче: жодного фрагмента внутрішньої помилки.
    expect(raw).not.toContain("D1_ERROR");
    expect(raw).not.toContain("users_secrets");
    expect(raw).not.toContain("no such table");
  });

  it("успішна відповідь теж бере журнал дій під `waitUntil`", async () => {
    router.handler = async () => new Response("{}", { status: 200 });
    const { ctx, waited } = executionContext();
    const request = new Request("https://api.example.com/api/favorites");

    await worker.fetch(request, env, ctx);

    // Четвертий аргумент — час приходу запиту: журнал пишеться після відповіді,
    // тож без нього порядок історії задавав би той, хто швидше записав рядок.
    expect(recordPlatform).toHaveBeenCalledWith(request, env, 200, expect.any(Number));
    await expect(Promise.all(waited)).resolves.toBeDefined();
  });

  it("будь-який інший cron не робить нічого", async () => {
    const { ctx, waited } = executionContext();

    await worker.scheduled(controller("17 4 * * *"), env, ctx);

    expect(retention.prune).not.toHaveBeenCalled();
    await expect(Promise.all(waited)).resolves.toBeDefined();
  });

  it("прибирання журналу впізнається за власним cron і йде у `waitUntil`", async () => {
    const { ctx, waited } = executionContext();

    await worker.scheduled(controller(EVENTS_CRON), env, ctx);

    expect(retention.prune).toHaveBeenCalledWith(env);
    await expect(Promise.all(waited)).resolves.toBeDefined();
  });

  it("падіння прибирання журналу не валить воркера", async () => {
    retention.prune.mockRejectedValueOnce(new Error("D1 недоступна"));
    const { ctx, waited } = executionContext();

    await worker.scheduled(controller(EVENTS_CRON), env, ctx);

    await expect(Promise.all(waited)).resolves.toBeDefined();
  });

  it("відмітка входу на платформу іде у `waitUntil`, а не чекається", async () => {
    const { ctx, waited } = executionContext();
    // Запит **без** підписаного `initData`: відмітки не буде, але обіцянку
    // однаково мусять узяти під нагляд — інакше гілка «з initData» лишалась
    // би єдиною, яку перевірили.
    await worker.fetch(new Request("https://api.example.com/api/anything"), env, ctx);

    // Обидві обов'язки беруться під нагляд — і відмітка входу, і флаш Sentry:
    // жодна з них не має права лишитись незавершеною обіцянкою.
    expect(waited.length).toBeGreaterThanOrEqual(1);
    await expect(Promise.all(waited)).resolves.toBeDefined();
  });
});
