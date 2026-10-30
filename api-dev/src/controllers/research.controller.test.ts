/**
 * `GET /api/public/research`: каталог, `null` і помилка — три різні відповіді.
 *
 * Сервіс справжній, оточення — фейкове: так перевіряється ланцюг цілком, а не
 * те, що мок повернув те, що в нього поклали.
 *
 * @module api-dev/src/controllers/research.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { handlePublicResearch } from "./research.controller";

const CATALOG = {
  title: "У що вірить людство",
  slug: "viruvannia",
  updatedAt: "2026-10-30",
  blocks: [
    {
      id: "a1",
      slug: "viruvannia-a1",
      group: "A",
      groupTitle: "Масштаб",
      title: "Сто відсотків",
      oneLiner: "Сім категорій",
      dataDate: "2020",
      publishedDate: "2025-06-09",
      dataStatus: "verified",
      readingTime: 7,
      keyFigures: [],
    },
  ],
};

function envWith(options: {
  cached?: unknown;
  rows?: { slug: string; title: string | null }[];
  fail?: boolean;
}): Env {
  return {
    CONTENT_KV: {
      get: async () => {
        if (options.fail) throw new Error("KV недоступний");
        return options.cached ?? null;
      },
      put: async () => undefined,
    },
    DB: {
      prepare: () => ({
        bind: () => ({ all: async () => ({ results: options.rows ?? [] }) }),
      }),
    },
  } as unknown as Env;
}

const request = new Request("https://api.example.com/api/public/research");

describe("GET /api/public/research", () => {
  it("віддає каталог із кеша", async () => {
    const response = await handlePublicResearch(request, envWith({ cached: CATALOG }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, catalog: CATALOG });
  });

  it("порожній каталог — це `null` зі статусом 200, а не 404", async () => {
    const response = await handlePublicResearch(request, envWith({}));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, catalog: null });
  });

  it("збій читання — 500 без вигаданого каталогу", async () => {
    const response = await handlePublicResearch(request, envWith({ fail: true }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });
});
