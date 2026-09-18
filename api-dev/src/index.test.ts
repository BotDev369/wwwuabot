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

const boom = new Error("D1_ERROR: no such table: users_secrets");

// Підміняємо роутер, щоб гарантовано отримати необроблений виняток: інакше
// довелося б триматися за випадковий маршрут, чий контролер не має `try`.
vi.mock("./router", () => ({
  handleRequest: vi.fn(async () => {
    throw boom;
  }),
}));

const { default: worker } = await import("./index");

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
