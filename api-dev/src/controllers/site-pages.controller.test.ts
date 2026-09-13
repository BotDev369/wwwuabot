import { describe, it, expect } from "vitest";
import { handleDeletePage, handlePublishPage, handleUpdatePage } from "./site-pages.controller";
import { createFakeDb, pageRow, siteRow } from "../services/sites/fake-db";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";

/**
 * Регресійні тести межі власника в `/api/sites/:slug/pages/:pid`.
 *
 * Головний випадок: `:slug` і `:pid` — два **незалежні** сегменти URL. Перевірки
 * «сайт належить мені» недостатньо: свій slug + чужий `pageId` проходив її, і
 * оновлення лягало в чужу сторінку. Це класичний IDOR (broken object-level
 * authorization): жертві достатньо один раз десь показати `pageId`, а UUID
 * сторінки видно в кожному посиланні редактора.
 *
 * Тому кожен тест тут перевіряє дві речі: код відповіді **і** те, що в базу не
 * пішло жодного запису — інакше «відмова» була б лише на словах.
 *
 * @module api-dev/src/controllers/site-pages.controller.test
 */

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

// ── Підписаний initData ──────────────────────────────────────
// Той самий алгоритм, що й у Telegram: HMAC-SHA256(WebAppData, bot_token).

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

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Заголовки запиту від імені користувача з підписаним `initData`. */
async function authHeaders(userId: number): Promise<Headers> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "AA-regression",
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
  });
  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  params.set("hash", toHex(await hmac(secret, checkString)));

  const headers = new Headers({ "Content-Type": "application/json" });
  headers.set(INIT_DATA_HEADER, params.toString());
  return headers;
}

// ── Оточення ─────────────────────────────────────────────────

/**
 * Воркер, у якому сайт `my-site` належить `ownerId`, а сторінка `page-1` —
 * **іншому** сайту (`pageSiteId`). Саме ця розбіжність і є тестом.
 */
function envWith(ownerId: number, pageSiteId: string, pageSlug = "about", pageId = "page-1") {
  const fake = createFakeDb((sql) => {
    if (sql.startsWith("SELECT * FROM sites WHERE slug = ?")) {
      return siteRow({ id: "site-1", slug: "my-site", owner_id: ownerId });
    }
    if (sql.startsWith("SELECT * FROM site_pages WHERE id = ?")) {
      return pageRow({ id: pageId, site_id: pageSiteId, slug: pageSlug });
    }
    return {};
  });

  const env: Env = {
    DB: fake.db,
    CONTENT_KV: {
      get: async () => null,
      put: async () => undefined,
      delete: async () => undefined,
    } as unknown as KVNamespace,
    ADMIN_SECRET: "test-admin-secret",
    BOT_TOKEN,
  };

  return { fake, env };
}

function call(
  handler: (r: Request, e: Env, slug: string, pid: string) => Promise<Response>,
  env: Env,
  userId: number,
  slug: string,
  pageId: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  return authHeaders(userId).then((headers) => {
    const request = new Request(`https://api.example.com/api/sites/${slug}/pages/${pageId}`, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handler(request, env, slug, pageId);
  });
}

const SITE_ID = "site-1";
const OWNER = 5;

// ── IDOR ─────────────────────────────────────────────────────

describe("чужий pageId під власним slug", () => {
  it("⛔ PUT не редагує чужу сторінку", async () => {
    const { fake, env } = envWith(OWNER, "site-victim");

    const res = await call(handleUpdatePage, env, OWNER, "my-site", "page-1", { title: "Хакнуто" });

    expect(res.status).toBe(404);
    expect(fake.writes).toHaveLength(0);
  });

  it("⛔ DELETE не видаляє чужу сторінку", async () => {
    const { fake, env } = envWith(OWNER, "site-victim");

    const res = await call(handleDeletePage, env, OWNER, "my-site", "page-1");

    expect(res.status).toBe(404);
    expect(fake.writes).toHaveLength(0);
  });

  it("⛔ POST /publish не публікує чужу сторінку", async () => {
    const { fake, env } = envWith(OWNER, "site-victim");

    const res = await call(handlePublishPage, env, OWNER, "my-site", "page-1");

    expect(res.status).toBe(404);
    expect(fake.writes).toHaveLength(0);
  });

  it("⛔ DELETE чужої головної сторінки не відповідає 400 «не можна видаляти home»", async () => {
    // Відповідь 400 тут — не захист, а підказка: вона підтверджує існування
    // сторінки з таким id. Перевірка власника мусить бути першою.
    const { fake, env } = envWith(OWNER, "site-victim", "home");

    const res = await call(handleDeletePage, env, OWNER, "my-site", "page-1");

    expect(res.status).toBe(404);
    expect(fake.writes).toHaveLength(0);
  });
});

// ── Дозволені дії ────────────────────────────────────────────

describe("власна сторінка у власному сайті", () => {
  it("✅ PUT оновлює", async () => {
    const { fake, env } = envWith(OWNER, SITE_ID);

    const res = await call(handleUpdatePage, env, OWNER, "my-site", "page-1", { title: "Нова" });

    expect(res.status).toBe(200);
    expect(fake.writes).toHaveLength(1);
    expect(fake.writes[0].sql).toContain("UPDATE site_pages SET title = ?");
  });

  it("✅ DELETE видаляє не-home сторінку", async () => {
    const { fake, env } = envWith(OWNER, SITE_ID, "about");

    const res = await call(handleDeletePage, env, OWNER, "my-site", "page-1");

    expect(res.status).toBe(200);
    expect(fake.writes).toHaveLength(1);
  });

  it("⛔ DELETE головної сторінки власного сайту — 400", async () => {
    const { fake, env } = envWith(OWNER, SITE_ID, "home");

    const res = await call(handleDeletePage, env, OWNER, "my-site", "page-1");

    expect(res.status).toBe(400);
    expect(fake.writes).toHaveLength(0);
  });

  it("✅ POST /publish публікує власну сторінку", async () => {
    const { fake, env } = envWith(OWNER, SITE_ID);

    const res = await call(handlePublishPage, env, OWNER, "my-site", "page-1");

    expect(res.status).toBe(200);
    expect(fake.writes[0].sql).toContain("published_at = ?");
  });
});

// ── Межа власника ────────────────────────────────────────────

describe("чужий сайт", () => {
  it("⛔ PUT відхиляє (403), навіть якщо сторінка справді в тому сайті", async () => {
    const { fake, env } = envWith(5, "site-1");

    const res = await call(handleUpdatePage, env, 6, "my-site", "page-1", { title: "Хакнуто" });

    expect(res.status).toBe(403);
    expect(fake.writes).toHaveLength(0);
  });

  it("⛔ без підпису initData — 401", async () => {
    const { fake, env } = envWith(OWNER, SITE_ID);

    const res = await handleUpdatePage(
      new Request("https://api.example.com/api/sites/my-site/pages/page-1", { method: "PUT" }),
      env,
      "my-site",
      "page-1",
    );

    expect(res.status).toBe(401);
    expect(fake.writes).toHaveLength(0);
  });
});
