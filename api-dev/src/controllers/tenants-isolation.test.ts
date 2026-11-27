/**
 * Два проєкти в одному ядрі: свій контент видно, чужий — ні.
 *
 * @module api-dev/src/controllers/tenants-isolation.test
 */

import { describe, expect, it } from "vitest";
import { HOME_SLUG } from "@wwwuabot/shared/content";
import type { Env } from "../shared/types";
import { handleScenario } from "./scenarios.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

const MAIN = { id: 1, key: "main", name: "Головний", status: "active" };
const SHOP = { id: 2, key: "shop-a", name: "Магазин", status: "active" };

interface Page {
  id: number;
  tenant_id: number;
  slug: string;
  title: string;
  is_active: number;
}

const TENANTS = [MAIN, SHOP];

const PAGES: Page[] = [
  { id: 10, tenant_id: MAIN.id, slug: HOME_SLUG, title: "Головна", is_active: 1 },
  { id: 11, tenant_id: MAIN.id, slug: "viruvannia", title: "Вірування", is_active: 1 },
  { id: 20, tenant_id: SHOP.id, slug: HOME_SLUG, title: "Магазин", is_active: 1 },
  { id: 21, tenant_id: SHOP.id, slug: "secret", title: "Секрет магазину", is_active: 1 },
];

const MEMBERS = [{ tenant_id: SHOP.id, user_id: 42 }];

/** D1, який знає про два проєкти й віддає лише рядки запитаного. */
function fakeDb(): D1Database {
  return {
    prepare(sql: string) {
      let args: unknown[] = [];
      const statement = {
        bind(...bound: unknown[]) {
          args = bound;
          return statement;
        },
        first: async () => {
          if (/FROM tenants WHERE key/.test(sql)) {
            return TENANTS.find((tenant) => tenant.key === args[0]) ?? null;
          }
          if (/FROM tenants WHERE id/.test(sql)) {
            return TENANTS.find((tenant) => tenant.id === args[0]) ?? null;
          }
          if (/FROM tenant_members/.test(sql)) {
            const [tenantId, userId] = args as number[];
            return MEMBERS.some((m) => m.tenant_id === tenantId && m.user_id === userId)
              ? { present: 1 }
              : null;
          }
          if (/FROM slug_aliases/.test(sql)) {
            const [tenantId, alias] = args as [number, string];
            return alias === "moving" && tenantId === MAIN.id ? { slug: "viruvannia" } : null;
          }
          return null;
        },
        all: async () => {
          if (/PRAGMA/i.test(sql)) return { results: [] };
          if (/FROM platform_pages/.test(sql)) {
            const [tenantId, ...slugs] = args as [number, ...string[]];
            return {
              results: PAGES.filter(
                (page) => page.tenant_id === tenantId && slugs.includes(page.slug),
              ),
            };
          }
          return { results: [] };
        },
        run: async () => ({ success: true, meta: { changes: 1 } }),
      } as unknown as D1PreparedStatement;
      return statement;
    },
  } as unknown as D1Database;
}

function makeEnv(): Env {
  return {
    DB: fakeDb(),
    CONTENT_KV: { get: async () => null, put: async () => undefined } as unknown as KVNamespace,
    BOT_TOKEN,
  } as unknown as Env;
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

/** Підписаний `initData`, як від Telegram. */
async function initData(userId: number, startParam?: string): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
  });
  if (startParam) params.set("start_param", startParam);
  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  const hash = await hmac(secret, checkString);
  params.set(
    "hash",
    Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  );
  return params.toString();
}

async function read(userId: number | null, startParam: string, slug: string) {
  const headers = new Headers();
  if (userId !== null) headers.set("X-Telegram-Init-Data", await initData(userId, startParam));
  const request = new Request(`https://api.example.com/api/scenario/${slug}`, { headers });
  const response = await handleScenario(request, makeEnv(), slug);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("ізоляція контенту за проєктому", () => {
  it("проєкт магазину бачить свій контент, а не головний", async () => {
    const home = await read(42, "p_shop-a", HOME_SLUG);
    expect(home.body.scenario).toMatchObject({ title: "Магазин" });

    const secret = await read(42, "p_shop-a", "secret");
    expect(secret.body.scenario).toMatchObject({ title: "Секрет магазину" });
  });

  it("головний проєкт не бачить контенту сусіднього", async () => {
    const own = await read(42, "p_main", "viruvannia");
    expect(own.body.scenario).toMatchObject({ title: "Вірування" });

    // Чужа адреса у головному проєкті не існує: відповідь — фолбек на головну,
    // без назви й без `pageData` чужого рядка.
    const foreign = await read(42, "p_main", "secret");
    expect(foreign.status).toBe(200);
    expect(foreign.body.scenario).toMatchObject({ title: "Головна" });
    expect(JSON.stringify(foreign.body)).not.toContain("Секрет магазину");
  });

  it("той самий slug — два різні рядки, кожен у своєму проєкті", async () => {
    const main = await read(42, "p_main", HOME_SLUG);
    const shop = await read(42, "p_shop-a", HOME_SLUG);
    expect(main.body.scenario).toMatchObject({ id: "10", title: "Головна" });
    expect(shop.body.scenario).toMatchObject({ id: "20", title: "Магазин" });
  });

  it("⛔ не член проєкту — 403, і жодного рядка назовні", async () => {
    const result = await read(43, "p_shop-a", "secret");
    expect(result.status).toBe(403);
    expect(JSON.stringify(result.body)).not.toContain("Секрет");
  });

  it("⛔ невідомий проєкт — 404, а не головний", async () => {
    const result = await read(42, "p_ghost", HOME_SLUG);
    expect(result.status).toBe(404);
  });

  it("deep-link сценарії бота ведуть у головний проєкт", async () => {
    for (const link of ["inv-8f3k2q", "mydate_19800303_today"]) {
      const result = await read(42, link, "viruvannia");
      expect(result.body.scenario, link).toMatchObject({ title: "Вірування" });
    }
  });

  it("переїзд адреси шукається в межах проєкту", async () => {
    const result = await read(42, "p_main", "moving");
    expect(result.body.scenario).toMatchObject({ title: "Вірування" });
  });
});
