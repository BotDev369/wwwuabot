/**
 * Каталог дослідження: кеш, промах із полагодженням і порожня база.
 *
 * @module api-dev/src/services/research.service.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";
import { RESEARCH_CATALOG_KEY, readResearchCatalog } from "./research.service";

const CACHED = {
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
  put?: ReturnType<typeof vi.fn>;
}) {
  const put = options.put ?? vi.fn(async () => undefined);
  const all = vi.fn(async () => ({ results: options.rows ?? [] }));
  const bind = vi.fn(() => ({ all }));
  const prepare = vi.fn(() => ({ bind }));
  const env = {
    CONTENT_KV: {
      get: async () => options.cached ?? null,
      put,
    },
    DB: { prepare },
  } as unknown as Env;

  return { env, put, prepare, bind, all };
}

describe("каталог дослідження", () => {
  it("віддає кеш і не питає базу", async () => {
    const { env, prepare } = envWith({ cached: CACHED });

    await expect(readResearchCatalog(env)).resolves.toEqual(CACHED);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("на промаху збирає каталог із рядків бази й кладе в KV", async () => {
    const { env, put, bind } = envWith({
      rows: [
        { slug: "viruvannia-a1", title: "Сто відсотків" },
        { slug: "viruvannia-d1", title: "Матриця вірувань" },
      ],
    });

    const catalog = await readResearchCatalog(env);

    expect(catalog?.blocks.map((block) => block.slug)).toEqual(["viruvannia-a1", "viruvannia-d1"]);
    expect(catalog?.blocks[0].id).toBe("a1");
    expect(catalog?.slug).toBe("viruvannia");
    expect(bind).toHaveBeenCalledWith("viruvannia-%");
    expect(put).toHaveBeenCalledWith(RESEARCH_CATALOG_KEY, expect.any(String));
  });

  it("порожня база — це null, а не порожній каталог", async () => {
    const { env, put } = envWith({ rows: [] });

    await expect(readResearchCatalog(env)).resolves.toBeNull();
    expect(put).not.toHaveBeenCalled();
  });
});
