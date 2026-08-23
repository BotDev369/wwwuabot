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

// 🔶 БЛОК: WESTERN ASTROLOGY CALCULATOR — параметри Категорії А (без часу/місця).
const SIGN_ORDER = [
  "Овен", "Телець", "Близнюки", "Рак", "Лев", "Діва",
  "Терези", "Скорпіон", "Стрілець", "Козоріг", "Водолій", "Риби"
];

const SIGN_CUTOFFS: Array<{ md: number; sign: string }> = [
  { md: 119, sign: "Козоріг" },
  { md: 218, sign: "Водолій" },
  { md: 320, sign: "Риби" },
  { md: 419, sign: "Овен" },
  { md: 520, sign: "Телець" },
  { md: 620, sign: "Близнюки" },
  { md: 722, sign: "Рак" },
  { md: 822, sign: "Лев" },
  { md: 922, sign: "Діва" },
  { md: 1022, sign: "Терези" },
  { md: 1121, sign: "Скорпіон" },
  { md: 1221, sign: "Стрілець" },
  { md: 1231, sign: "Козоріг" }
];

const SIGN_META: Record<string, { element: string; modality: string; ruler: string; traditionalRuler: string; startMonth: number; startDay: number }> = {
  "Овен": { element: "Вогонь", modality: "Кардинальний", ruler: "Марс", traditionalRuler: "Марс", startMonth: 3, startDay: 21 },
  "Телець": { element: "Земля", modality: "Фіксований", ruler: "Венера", traditionalRuler: "Венера", startMonth: 4, startDay: 20 },
  "Близнюки": { element: "Повітря", modality: "Мутабельний", ruler: "Меркурій", traditionalRuler: "Меркурій", startMonth: 5, startDay: 21 },
  "Рак": { element: "Вода", modality: "Кардинальний", ruler: "Місяць", traditionalRuler: "Місяць", startMonth: 6, startDay: 21 },
  "Лев": { element: "Вогонь", modality: "Фіксований", ruler: "Сонце", traditionalRuler: "Сонце", startMonth: 7, startDay: 23 },
  "Діва": { element: "Земля", modality: "Мутабельний", ruler: "Меркурій", traditionalRuler: "Меркурій", startMonth: 8, startDay: 23 },
  "Терези": { element: "Повітря", modality: "Кардинальний", ruler: "Венера", traditionalRuler: "Венера", startMonth: 9, startDay: 23 },
  "Скорпіон": { element: "Вода", modality: "Фіксований", ruler: "Плутон", traditionalRuler: "Марс", startMonth: 10, startDay: 23 },
  "Стрілець": { element: "Вогонь", modality: "Мутабельний", ruler: "Юпітер", traditionalRuler: "Юпітер", startMonth: 11, startDay: 22 },
  "Козоріг": { element: "Земля", modality: "Кардинальний", ruler: "Сатурн", traditionalRuler: "Сатурн", startMonth: 12, startDay: 22 },
  "Водолій": { element: "Повітря", modality: "Фіксований", ruler: "Уран", traditionalRuler: "Сатурн", startMonth: 1, startDay: 20 },
  "Риби": { element: "Вода", modality: "Мутабельний", ruler: "Нептун", traditionalRuler: "Юпітер", startMonth: 2, startDay: 19 }
};

function getSunSign(month: number, day: number): string {
  const md = month * 100 + day;
  for (const c of SIGN_CUTOFFS) {
    if (md <= c.md) return c.sign;
  }
  return "Козоріг";
}

function daysSinceSignStart(startMonth: number, startDay: number, month: number, day: number): number {
  const ref = 2001;
  const start = Date.UTC(ref, startMonth - 1, startDay);
  let current = Date.UTC(ref, month - 1, day);
  if (current < start) current = Date.UTC(ref + 1, month - 1, day);
  return Math.round((current - start) / 86400000);
}

function getCuspInfo(sign: string, dayOffset: number): string {
  const idx = SIGN_ORDER.indexOf(sign);
  if (dayOffset <= 1) return `Можливо, межа з ${SIGN_ORDER[(idx + 11) % 12]}`;
  if (dayOffset >= 28) return `Можливо, межа з ${SIGN_ORDER[(idx + 1) % 12]}`;
  return "Ні";
}

function calculateWesternAstrology(day: number, month: number) {
  const sign = getSunSign(month, day);
  const meta = SIGN_META[sign];
  const dayOffset = daysSinceSignStart(meta.startMonth, meta.startDay, month, day);
  const decanIndex = Math.min(2, Math.floor(dayOffset / 10));
  const decanLabel = ["1-й декан", "2-й декан", "3-й декан"][decanIndex];
  const degree = Math.min(29, Math.round((dayOffset / 30) * 29));

  return {
    parameters: [
      { key: "sunSign", label: "Знак Сонця", value: sign },
      { key: "element", label: "Стихія", value: meta.element },
      { key: "modality", label: "Якість (хрест)", value: meta.modality },
      { key: "ruler", label: "Управитель (сучасний)", value: meta.ruler },
      { key: "traditionalRuler", label: "Традиційний управитель", value: meta.traditionalRuler },
      { key: "decan", label: "Декан", value: decanLabel },
      { key: "degree", label: "Наближений градус Сонця", value: `~${degree}°` },
      { key: "cusp", label: "Прикордонний знак", value: getCuspInfo(sign, dayOffset) }
    ],
    comingSoon: ["Місяць", "Меркурій", "Венера", "Марс", "Юпітер", "Сатурн", "Уран", "Нептун", "Плутон"]
  };
}

// 🔶 БЛОК: РЕЄСТР КАЛЬКУЛЯТОРІВ СИСТЕМ — mapping systemId → функція розрахунку за 'YYYY-MM-DD'.
const SYSTEM_CALCULATORS: Record<string, (date: string) => any> = {
  western: (date: string) => {
    const [, month, day] = date.split("-").map((n) => parseInt(n, 10));
    return calculateWesternAstrology(day, month);
  }
};

// 🔶 БЛОК: MYDATE ANALYSIS STORAGE — D1 (джерело правди) + KV (write-through кеш).
async function getAnalysis(db: D1Database, kv: KVNamespace, date: string): Promise<Record<string, any>> {
  const kvKey = `mydate:analysis:${date}`;
  const cached = await kv.get(kvKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // падаємо нижче в D1
    }
  }
  const row = await db.prepare(`SELECT systems_data FROM mydate_analysis WHERE date = ?`).bind(date).first();
  if (row?.systems_data) {
    try {
      const parsed = JSON.parse(row.systems_data as string);
      await kv.put(kvKey, JSON.stringify(parsed));
      return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

async function saveAnalysis(db: D1Database, kv: KVNamespace, date: string, systemId: string, result: any): Promise<Record<string, any>> {
  const existing = await getAnalysis(db, kv, date);
  const updated = { ...existing, [systemId]: result };
  const json = JSON.stringify(updated);
  await db
    .prepare(
      `INSERT INTO mydate_analysis (date, systems_data, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(date) DO UPDATE SET systems_data = excluded.systems_data, updated_at = excluded.updated_at`
    )
    .bind(date, json)
    .run();
  await kv.put(`mydate:analysis:${date}`, json);
  return updated;
}

    // 🔶 БЛОК: MYDATE ANALYSIS READ — кешований результат аналізу дати.
    if (url.pathname.startsWith("/api/mydate/analysis/")) {
      const date = decodeURIComponent(url.pathname.replace("/api/mydate/analysis/", ""));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return json({ ok: false, error: "Invalid date format, expected YYYY-MM-DD" }, 400);
      }
      try {
        const systems = await getAnalysis(env.DB, env.CONTENT_KV, date);
        return json({ ok: true, date, systems });
      } catch (e: any) {
        console.error("Analysis read error:", e);
        return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
      }
    }

    // 🔶 БЛОК: MYDATE ANALYZE — розрахунок однієї системи за кліком, запис у кеш.
    if (url.pathname === "/api/mydate/analyze" && request.method === "POST") {
      try {
        const body: any = await request.json();
        const date = body?.date;
        const systemId = body?.systemId;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return json({ ok: false, error: "Invalid or missing date" }, 400);
        }
        const calculator = SYSTEM_CALCULATORS[systemId];
        if (!calculator) {
          return json({ ok: false, error: `System "${systemId}" is not implemented yet` }, 400);
        }
        const result = calculator(date);
        const allSystems = await saveAnalysis(env.DB, env.CONTENT_KV, date, systemId, result);
        return json({ ok: true, date, systemId, result, systems: allSystems });
      } catch (e: any) {
        console.error("Analyze error:", e);
        return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
      }
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
