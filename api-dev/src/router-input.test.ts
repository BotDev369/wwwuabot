/**
 * Поганий ввід мусить виглядати як помилка клієнта (400), а не як збій сервера
 * (500).
 *
 * `/api/scenario/%` і `/api/mydate/analysis/%zz` зривали `decodeURIComponent`,
 * виняток вилітав із воркера — і сміттєвий запит (сканер, обрізане посилання,
 * битий `encodeURIComponent` у клієнті) створював помилку в Sentry та
 * споживав безкоштовну квоту. Тут фіксується саме різниця між 400 і 500.
 *
 * Адмін-гейт і легасі-поверхні — в `router.test.ts`.
 *
 * @module api-dev/src/router-input.test
 */

import { describe, expect, it } from "vitest";
import { handleRequest } from "./router";
import type { Env } from "./shared/types";

// Ці маршрути не торкаються ні БД, ні сесії — тому порожнього `env` досить.
// Якщо колись знадобиться справжній, він є в `router.test.ts` (`makeEnv`).
const env = {} as Env;

async function call(path: string): Promise<Response> {
  return handleRequest(new Request(`https://api.example.com${path}`), env);
}

describe("бите кодування в шляху", () => {
  it("GET /api/scenario/% → 400", async () => {
    expect((await call("/api/scenario/%")).status).toBe(400);
  });

  it("GET /api/scenario/%zz → 400", async () => {
    expect((await call("/api/scenario/%zz")).status).toBe(400);
  });

  it("GET /api/mydate/analysis/% → 400", async () => {
    expect((await call("/api/mydate/analysis/%")).status).toBe(400);
  });
});

describe("звичайні відповіді не змінилися", () => {
  it("невідомий шлях → 404", async () => {
    expect((await call("/nope")).status).toBe(404);
  });

  it("GET /health → 200 навіть без біндингів", async () => {
    expect((await call("/health")).status).toBe(200);
  });
});
