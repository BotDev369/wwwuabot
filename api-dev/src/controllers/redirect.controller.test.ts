/** Тест `GET /api/public/redirect`: що відповідаємо на стару адресу й на збій бази. */

import { describe, it, expect } from "vitest";
import { handlePublicRedirect } from "./redirect.controller";
import type { Env } from "../shared/types";

const ALIASES: Record<string, string> = {
  "viruvannia-a1": "viruvannia/sto-vidsotkiv",
};

/** База, у якій alias-рядок є або його немає; `fail` — щоб перевірити `500`. */
function fakeD1(fail = false): D1Database {
  const db = {
    prepare(sql: string) {
      let arg = "";
      const statement = {
        bind: (value: unknown) => {
          arg = String(value);
          return statement;
        },
        run: async () => ({ meta: { changes: 0 } }),
        all: async () => ({ results: [{ name: "alias" }, { name: "slug" }] }),
        first: async () => {
          if (fail) throw new Error("D1_ERROR: no such table");
          const target = ALIASES[arg];
          return target === undefined ? null : { slug: target };
        },
      };
      void sql;
      return statement;
    },
  };
  return db as unknown as D1Database;
}

const call = (path: string | null, fail = false): Promise<Response> => {
  const query = path === null ? "" : `?path=${encodeURIComponent(path)}`;
  return handlePublicRedirect(new Request(`https://api.test/api/public/redirect${query}`), {
    DB: fakeD1(fail),
  } as unknown as Env);
};

const bodyOf = async (response: Response) => (await response.json()) as Record<string, unknown>;

describe("GET /api/public/redirect", () => {
  it("стара адреса веде на поточну", async () => {
    const response = await call("viruvannia-a1");

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ ok: true, to: "/viruvannia/sto-vidsotkiv" });
  });

  it("зайві слеші навколо адреси не заважають", async () => {
    expect(await bodyOf(await call("/viruvannia-a1/"))).toEqual({
      ok: true,
      to: "/viruvannia/sto-vidsotkiv",
    });
  });

  it("невідома адреса — `null`, а не помилка", async () => {
    expect(await bodyOf(await call("take-shcho-ne-maie"))).toEqual({ ok: true, to: null });
  });

  it("без параметра нічого не шукає", async () => {
    expect(await bodyOf(await call(null))).toEqual({ ok: true, to: null });
  });

  it("збій бази — `500` із поясненням, без вигаданої адреси", async () => {
    const response = await call("viruvannia-a1", true);

    expect(response.status).toBe(500);
    expect(await bodyOf(response)).toEqual({ ok: false, error: "Не вдалося перевірити адресу" });
  });
});
