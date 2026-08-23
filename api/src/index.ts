// 🔶 БЛОК: API-ВОРКЕР — універсальний шлюз для всіх субпроєктів.
// Віддає сценарії з D1 для TWA-фронтенду.

export interface Env {
  DB: D1Database;
  CONTENT_KV: KVNamespace;
}

// 🔶 БЛОК: КОНФІГ __base__ — дефолтна сторінка Base 1.0.
// Контент тимчасовий, пізніше буде динамічним з БД.
const BASE_CONFIG = {
  v: 1,
  meta: { title: "WWWUABot — Головна" },
  layout: {
    slots: ["header", "sidebar", "main", "footer"]
  },
  slots: {
    main: [
      { component: "Heading", props: { text: "Вітаємо на веб-платформі WWWUABot!" } },
      { component: "Button", props: { label: "Перейти на головну", href: "/" } }
    ]
  }
};

// 🔶 БЛОК: ENSURE_BASE — гарантовано створює __base__ в D1 при першому запиті.
async function ensureBase(db: D1Database): Promise<void> {
  // Перевіряємо існування таблиці scenarios
  const tableCheck = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scenarios'")
    .first();

  if (!tableCheck) {
    await db.exec(`
      CREATE TABLE scenarios (
        codeword TEXT PRIMARY KEY,
        photo_url TEXT,
        caption_top TEXT,
        caption_mid TEXT,
        caption_bot TEXT,
        keyboard_type TEXT NOT NULL DEFAULT 'static',
        buttons TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        price TEXT,
        qty_options TEXT,
        awaits_input TEXT,
        input_path TEXT,
        input_next TEXT,
        title TEXT,
        notify_groups TEXT,
        notify_template TEXT,
        rich_message TEXT,
        rich_data TEXT,
        web_config TEXT DEFAULT NULL,
        web_slug TEXT DEFAULT NULL,
        is_active INTEGER DEFAULT 1
      );
    `);
  }

  // Ідемпотентно створюємо __base__ якщо його немає
  await db
    .prepare(
      `INSERT OR IGNORE INTO scenarios (codeword, web_slug, web_config, is_active)
       VALUES ('__base__', '/', ?, 1)`
    )
    .bind(JSON.stringify(BASE_CONFIG))
    .run();
}

// 🔶 БЛОК: РОЗВ'ЯЗУВАЧ СЦЕНАРІЮ — base + explicit, fallback на __base__.
async function resolveScenario(db: D1Database, slug: string) {
  await ensureBase(db);

  // Шукаємо exact match
  let row: any = null;
  if (slug && slug !== "__base__") {
    row = await db
      .prepare(
        `SELECT codeword, web_slug, web_config FROM scenarios
         WHERE (web_slug = ? OR codeword = ?) AND is_active = 1
         LIMIT 1`
      )
      .bind(slug, slug)
      .first();
  }

  // Fallback на __base__
  if (!row) {
    row = await db
      .prepare(
        `SELECT codeword, web_slug, web_config FROM scenarios WHERE codeword = '__base__'`
      )
      .first();
  }

  let config = BASE_CONFIG;
  try {
    if (row?.web_config) {
      const parsed = JSON.parse(row.web_config);
      if (parsed?.v === 1) config = parsed;
    }
  } catch (e) {
    // Битий JSON — повертаємо base (каскад G2 з інструкції 5.6)
    console.error("Invalid web_config JSON for", slug, e);
  }

  return {
    scenario: {
      codeword: row?.codeword ?? "__base__",
      web_slug: row?.web_slug ?? "/"
    },
    config
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const json = (body: any, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
      });

    // Health check
    if (url.pathname === "/health") {
      return json({
        status: "ok",
        worker: "wwwuabot-api",
        timestamp: new Date().toISOString()
      });
    }

    // 🔶 БЛОК: MYDATE SYSTEMS — список систем аналізу з KV.
    if (url.pathname === "/api/mydate/systems") {
      try {
        const raw = await env.CONTENT_KV.get("mydate:systems");
        const systems = raw ? JSON.parse(raw) : [];
        return json({ ok: true, systems });
      } catch (e: any) {
        console.error("KV systems error:", e);
        return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
      }
    }

    // Scenario endpoint
    if (url.pathname.startsWith("/api/scenario/")) {
      const slug = decodeURIComponent(url.pathname.replace("/api/scenario/", ""));
      try {
        const { scenario, config } = await resolveScenario(env.DB, slug);
        return json({
          ok: true,
          scenario,
          config,
          userContext: { authenticated: false, roles: [], flags: [] }
        });
      } catch (e: any) {
        console.error("Scenario error:", e);
        return json(
          { ok: false, error: e?.message ?? "Unknown error" },
          500
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
