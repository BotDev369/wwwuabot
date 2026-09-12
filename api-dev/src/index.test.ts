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

// Обробник бере лише (request, env) — `ExecutionContext` не потрібен.
const env = {} as Env;

describe("необроблений виняток", () => {
  it("віддає 500 без деталей, а не сирий stack trace", async () => {
    const response = await worker.fetch(new Request("https://api.example.com/api/anything"), env);

    expect(response.status).toBe(500);
    const raw = await response.text();
    expect(JSON.parse(raw)).toEqual({ error: "Internal error" });
    // Найдорожче: жодного фрагмента внутрішньої помилки.
    expect(raw).not.toContain("D1_ERROR");
    expect(raw).not.toContain("users_secrets");
    expect(raw).not.toContain("no such table");
  });
});
