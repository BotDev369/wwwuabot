/**
 * Екрани й чужі проєкти: відмова резолвера доходить до клієнта як є, а база не
 * читається взагалі. Це та гілка, яку інакше не побачити: щоб дійти до неї,
 * потрібен підписаний `initData` з чужим ключем.
 *
 * @module api-dev/src/controllers/screens.tenancy.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const handlers = vi.hoisted(() => ({ calls: 0 }));

vi.mock("../shared/tenant", () => ({
  resolveTenant: async () => {
    handlers.calls += 1;
    return { ok: false as const, response: new Response(null, { status: 404 }) };
  },
}));

const { handleScreens, handleScreenTexts } = await import("./screens.controller");

/** D1, який рахує звернення: відмова не має права його торкнутись. */
function makeEnv(): { env: Env; reads: string[] } {
  const reads: string[] = [];
  const db = {
    prepare(sql: string) {
      reads.push(sql);
      const statement = {
        bind: () => statement,
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 0 } }),
      };
      return statement;
    },
  };
  return { env: { DB: db } as unknown as Env, reads };
}

describe("екрани: проєкт запиту", () => {
  it("⛔ дерево екранів не віддається без права на проєкт", async () => {
    const { env, reads } = makeEnv();
    const response = await handleScreens(new Request("https://api.test/api/screens"), env);

    expect(response.status).toBe(404);
    expect(reads).toEqual([]);
  });

  it("⛔ тексти екрана — те саме, і жодного запиту до бази", async () => {
    const { env, reads } = makeEnv();
    const response = await handleScreenTexts(
      new Request("https://api.test/api/screens/services"),
      env,
      "services",
    );

    expect(response.status).toBe(404);
    expect(reads).toEqual([]);
  });
});
