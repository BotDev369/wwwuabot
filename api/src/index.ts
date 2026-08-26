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
    slots: ["header", "sidebar", "main", "footer"],
  },
  slots: {
    main: [
      { component: "Heading", props: { text: "Вітаємо на веб-платформі WWWUABot!" } },
      { component: "Button", props: { label: "Перейти на головну", href: "/" } },
    ],
  },
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
       VALUES ('__base__', '/', ?, 1)`,
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
         LIMIT 1`,
      )
      .bind(slug, slug)
      .first();
  }

  // Fallback на __base__
  if (!row) {
    row = await db
      .prepare(`SELECT codeword, web_slug, web_config FROM scenarios WHERE codeword = '__base__'`)
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
      web_slug: row?.web_slug ?? "/",
    },
    config,
  };
}

// 🔶 БЛОК: ENSURE MY_DATES COLUMN — гарантовано створює колонку my_dates в таблиці users.
async function ensureMyDatesColumn(db: D1Database): Promise<void> {
  const check = await db.prepare("PRAGMA table_info(users)").all();
  const hasColumn = check.results?.some((col: any) => col.name === "my_dates");
  if (!hasColumn) {
    console.log("[Auto-Migrate] Creating column: users.my_dates TEXT DEFAULT NULL");
    await db.prepare("ALTER TABLE users ADD COLUMN my_dates TEXT DEFAULT NULL").run();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const json = (body: any, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    // Health check
    if (url.pathname === "/health") {
      return json({
        status: "ok",
        worker: "wwwuabot-api",
        timestamp: new Date().toISOString(),
      });
    }

    // 🔶 БЛОК: WESTERN ASTROLOGY CALCULATOR — параметри Категорії А (без часу/місця).
    const SIGN_ORDER = [
      "Овен",
      "Телець",
      "Близнюки",
      "Рак",
      "Лев",
      "Діва",
      "Терези",
      "Скорпіон",
      "Стрілець",
      "Козоріг",
      "Водолій",
      "Риби",
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
      { md: 1231, sign: "Козоріг" },
    ];

    const SIGN_META: Record<
      string,
      {
        element: string;
        modality: string;
        ruler: string;
        traditionalRuler: string;
        startMonth: number;
        startDay: number;
      }
    > = {
      Овен: {
        element: "Вогонь",
        modality: "Кардинальний",
        ruler: "Марс",
        traditionalRuler: "Марс",
        startMonth: 3,
        startDay: 21,
      },
      Телець: {
        element: "Земля",
        modality: "Фіксований",
        ruler: "Венера",
        traditionalRuler: "Венера",
        startMonth: 4,
        startDay: 20,
      },
      Близнюки: {
        element: "Повітря",
        modality: "Мутабельний",
        ruler: "Меркурій",
        traditionalRuler: "Меркурій",
        startMonth: 5,
        startDay: 21,
      },
      Рак: {
        element: "Вода",
        modality: "Кардинальний",
        ruler: "Місяць",
        traditionalRuler: "Місяць",
        startMonth: 6,
        startDay: 21,
      },
      Лев: {
        element: "Вогонь",
        modality: "Фіксований",
        ruler: "Сонце",
        traditionalRuler: "Сонце",
        startMonth: 7,
        startDay: 23,
      },
      Діва: {
        element: "Земля",
        modality: "Мутабельний",
        ruler: "Меркурій",
        traditionalRuler: "Меркурій",
        startMonth: 8,
        startDay: 23,
      },
      Терези: {
        element: "Повітря",
        modality: "Кардинальний",
        ruler: "Венера",
        traditionalRuler: "Венера",
        startMonth: 9,
        startDay: 23,
      },
      Скорпіон: {
        element: "Вода",
        modality: "Фіксований",
        ruler: "Плутон",
        traditionalRuler: "Марс",
        startMonth: 10,
        startDay: 23,
      },
      Стрілець: {
        element: "Вогонь",
        modality: "Мутабельний",
        ruler: "Юпітер",
        traditionalRuler: "Юпітер",
        startMonth: 11,
        startDay: 22,
      },
      Козоріг: {
        element: "Земля",
        modality: "Кардинальний",
        ruler: "Сатурн",
        traditionalRuler: "Сатурн",
        startMonth: 12,
        startDay: 22,
      },
      Водолій: {
        element: "Повітря",
        modality: "Фіксований",
        ruler: "Уран",
        traditionalRuler: "Сатурн",
        startMonth: 1,
        startDay: 20,
      },
      Риби: {
        element: "Вода",
        modality: "Мутабельний",
        ruler: "Нептун",
        traditionalRuler: "Юпітер",
        startMonth: 2,
        startDay: 19,
      },
    };

    function getSunSign(month: number, day: number): string {
      const md = month * 100 + day;
      for (const c of SIGN_CUTOFFS) {
        if (md <= c.md) return c.sign;
      }
      return "Козоріг";
    }

    function daysSinceSignStart(
      startMonth: number,
      startDay: number,
      month: number,
      day: number,
    ): number {
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
          {
            key: "traditionalRuler",
            label: "Традиційний управитель",
            value: meta.traditionalRuler,
          },
          { key: "decan", label: "Декан", value: decanLabel },
          { key: "degree", label: "Наближений градус Сонця", value: `~${degree}°` },
          { key: "cusp", label: "Прикордонний знак", value: getCuspInfo(sign, dayOffset) },
        ],
        comingSoon: [
          "Місяць",
          "Меркурій",
          "Венера",
          "Марс",
          "Юпітер",
          "Сатурн",
          "Уран",
          "Нептун",
          "Плутон",
        ],
      };
    }

    // 🔶 БЛОК: РЕЄСТР КАЛЬКУЛЯТОРІВ СИСТЕМ — mapping systemId → функція розрахунку за 'YYYY-MM-DD'.
    const SYSTEM_CALCULATORS: Record<string, (date: string) => any> = {
      western: (date: string) => {
        const [, month, day] = date.split("-").map((n) => parseInt(n, 10));
        return calculateWesternAstrology(day, month);
      },
    };

    // 🔶 БЛОК: МИДЕЙТ СИСТЕМИ — дефолтний реєстр з параметрами.
    // KV `mydate:systems` має пріоритет (поля перевизначаються), дефолт заповнює прогалини (напр. parameters).
    const DEFAULT_MYDATE_SYSTEMS: Array<{
      id: string;
      name: string;
      description: string;
      implemented: boolean;
      parameters: Array<{ key: string; label: string }>;
    }> = [
      {
        id: "western",
        name: "Західна астрологія",
        description: "Параметри на основі положення Сонця в зодіакальному колі.",
        implemented: true,
        parameters: [
          { key: "sunSign", label: "Знак Сонця" },
          { key: "element", label: "Стихія" },
          { key: "modality", label: "Якість (хрест)" },
          { key: "ruler", label: "Управитель (сучасний)" },
          { key: "traditionalRuler", label: "Традиційний управитель" },
          { key: "decan", label: "Декан" },
          { key: "degree", label: "Наближений градус Сонця" },
          { key: "cusp", label: "Прикордонний знак" },
        ],
      },
    ];

    async function getSystemsRegistry(env: Env): Promise<any[]> {
      const raw = await env.CONTENT_KV.get("mydate:systems");
      const kvSystems: any[] = raw ? JSON.parse(raw) : [];
      const kvById = new Map(kvSystems.map((s) => [s.id, s]));
      const merged: any[] = DEFAULT_MYDATE_SYSTEMS.map((def) => {
        const kv = kvById.get(def.id);
        if (!kv) return def;
        const params =
          Array.isArray(kv.parameters) && kv.parameters.length ? kv.parameters : def.parameters;
        return { ...def, ...kv, parameters: params };
      });
      for (const s of kvSystems) {
        if (!DEFAULT_MYDATE_SYSTEMS.some((d) => d.id === s.id)) {
          merged.push({ ...s, parameters: Array.isArray(s.parameters) ? s.parameters : [] });
        }
      }
      return merged;
    }

    // 🔶 БЛОК: MYDATE ANALYSIS STORAGE — D1 (джерело правди) + KV (write-through кеш).
    async function getAnalysis(
      db: D1Database,
      kv: KVNamespace,
      date: string,
    ): Promise<Record<string, any>> {
      const kvKey = `mydate:analysis:${date}`;
      const cached = await kv.get(kvKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // падаємо нижче в D1
        }
      }
      const row = await db
        .prepare(`SELECT systems_data FROM mydate_analysis WHERE date = ?`)
        .bind(date)
        .first();
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

    async function saveAnalysis(
      db: D1Database,
      kv: KVNamespace,
      date: string,
      systemId: string,
      result: any,
    ): Promise<Record<string, any>> {
      const existing = await getAnalysis(db, kv, date);
      const updated = { ...existing, [systemId]: result };
      const json = JSON.stringify(updated);
      await db
        .prepare(
          `INSERT INTO mydate_analysis (date, systems_data, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(date) DO UPDATE SET systems_data = excluded.systems_data, updated_at = excluded.updated_at`,
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

    // 🔶 БЛОК: MYDATE SYSTEMS — список систем аналізу (KV-реєстр + дефолтні параметри).
    if (url.pathname === "/api/mydate/systems") {
      try {
        const systems = await getSystemsRegistry(env);
        return json({ ok: true, systems });
      } catch (e: any) {
        console.error("KV systems error:", e);
        return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
      }
    }

    // 🔶 БЛОК: MYDATE COMPARE — співставлення кількох дат за обраними системами/параметрами.
    if (url.pathname === "/api/mydate/compare" && request.method === "POST") {
      try {
        const body: any = await request.json();
        const dates: string[] = Array.isArray(body?.dates) ? body.dates : [];
        const systemIds: string[] | undefined =
          Array.isArray(body?.systemIds) && body.systemIds.length ? body.systemIds : undefined;
        const parameterKeys: string[] | undefined =
          Array.isArray(body?.parameterKeys) && body.parameterKeys.length
            ? body.parameterKeys
            : undefined;

        const validDates = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
        if (validDates.length === 0) {
          return json({ ok: false, error: "No valid dates provided" }, 400);
        }
        if (validDates.length > 30) {
          return json({ ok: false, error: "Too many dates, max 30" }, 400);
        }

        const registry = await getSystemsRegistry(env);
        const targetSystems = systemIds
          ? registry.filter((s) => systemIds.includes(s.id) && s.implemented)
          : registry.filter((s) => s.implemented);

        const matrix: Record<string, any> = {};
        for (const date of validDates) {
          const analysis = await getAnalysis(env.DB, env.CONTENT_KV, date);
          const perSystem: Record<string, any> = {};
          for (const sys of targetSystems) {
            let result = analysis[sys.id];
            if (!result) {
              const calculator = SYSTEM_CALCULATORS[sys.id];
              if (!calculator) continue;
              result = calculator(date);
              await saveAnalysis(env.DB, env.CONTENT_KV, date, sys.id, result);
            }
            const selected = parameterKeys
              ? (result.parameters ?? []).filter((p: any) => parameterKeys.includes(p.key))
              : (result.parameters ?? []);
            perSystem[sys.id] = Object.fromEntries(selected.map((p: any) => [p.key, p.value]));
          }
          matrix[date] = perSystem;
        }

        return json({
          ok: true,
          dates: validDates,
          systems: targetSystems.map((s) => s.id),
          matrix,
        });
      } catch (e: any) {
        console.error("Compare error:", e);
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
          userContext: { authenticated: false, roles: [], flags: [] },
        });
      } catch (e: any) {
        console.error("Scenario error:", e);
        return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
      }
    }

    // 🔶 БЛОК: MY-DATES — CRUD для персональних дат користувача.
    if (url.pathname === "/api/my-dates") {
      try {
        // Гарантуємо наявність колонки my_dates
        await ensureMyDatesColumn(env.DB);

        const userIdStr = request.headers.get("X-Telegram-User-Id");
        if (!userIdStr) {
          return json({ ok: false, error: "X-Telegram-User-Id header required" }, 401);
        }
        const userId = parseInt(userIdStr, 10);
        if (isNaN(userId)) {
          return json({ ok: false, error: "Invalid user_id" }, 401);
        }

        // Отримуємо або створюємо користувача
        let user = await env.DB.prepare("SELECT * FROM users WHERE user_id = ?")
          .bind(userId)
          .first();
        if (!user) {
          await env.DB.prepare(
            "INSERT INTO users (user_id, first_name, last_name, username, language) VALUES (?, '...', '...', '...', '...')",
          )
            .bind(userId)
            .run();
          user = await env.DB.prepare("SELECT * FROM users WHERE user_id = ?").bind(userId).first();
        }
        if (!user) {
          return json({ ok: false, error: "Failed to create user" }, 500);
        }

        // Читаємо my_dates з JSON колонки
        let dates: any[] = [];
        let needsMigration = false;
        try {
          const raw = (user as any).my_dates;
          if (raw && typeof raw === "string") {
            const parsed = JSON.parse(raw);
            dates = Array.isArray(parsed.items) ? parsed.items : [];
          } else if (raw && typeof raw === "object" && Array.isArray(raw.items)) {
            dates = raw.items;
          }
        } catch {
          dates = [];
        }

        // Міграція: старі формати (alias/category) → нові (name/type/tags)
        const VALID_TYPES = ["person", "event", "other"];
        dates = dates.map((d: any) => {
          if (d.name === undefined && (d.alias || d.category)) {
            needsMigration = true;
            return {
              ...d,
              type: VALID_TYPES.includes(d.type) ? d.type : "other",
              name: d.name || d.alias || "",
              tags: Array.isArray(d.tags) ? d.tags : d.category ? [d.category] : [],
              created_at: d.created_at || new Date().toISOString().replace("T", " ").slice(0, 19),
              updated_at:
                d.updated_at ||
                d.created_at ||
                new Date().toISOString().replace("T", " ").slice(0, 19),
            };
          }
          // Якщо name вже є, але type невалідний — виправити
          if (d.name !== undefined && !VALID_TYPES.includes(d.type)) {
            needsMigration = true;
            return { ...d, type: "other" };
          }
          // Якщо tags порожні або не масив — відновити з category
          if (
            d.name !== undefined &&
            (!Array.isArray(d.tags) || d.tags.length === 0) &&
            d.category
          ) {
            needsMigration = true;
            return { ...d, tags: [d.category] };
          }
          return d;
        });

        // Зберігаємо мігровані дані
        if (needsMigration && dates.length > 0) {
          await env.DB.prepare("UPDATE users SET my_dates = ? WHERE user_id = ?")
            .bind(JSON.stringify({ items: dates }), userId)
            .run();
        }

        // GET — список дат
        if (request.method === "GET") {
          return json({ ok: true, dates });
        }

        // POST — додати дату
        if (request.method === "POST") {
          let body: any;
          try {
            body = await request.json();
          } catch {
            return json({ ok: false, error: "Invalid JSON" }, 400);
          }
          const { date, type, name, tags, notes, alias, category } = body;
          if (!date) return json({ ok: false, error: "date is required" }, 400);

          const now = new Date().toISOString().replace("T", " ").slice(0, 19);
          const VALID_TYPES = ["person", "event", "other"];
          const newDate = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            user_id: userId,
            date,
            type: VALID_TYPES.includes(type) ? type : "other",
            name: name || alias || "",
            tags: Array.isArray(tags) ? tags : category ? [category] : [],
            notes: notes || "",
            created_at: now,
            updated_at: now,
          };
          dates.push(newDate);

          await env.DB.prepare("UPDATE users SET my_dates = ? WHERE user_id = ?")
            .bind(JSON.stringify({ items: dates }), userId)
            .run();

          return json({ ok: true, id: newDate.id });
        }

        // PUT — оновити дату
        if (request.method === "PUT") {
          let body: any;
          try {
            body = await request.json();
          } catch {
            return json({ ok: false, error: "Invalid JSON" }, 400);
          }
          const { id, date, type, name, tags, notes, alias, category } = body;
          if (!id) return json({ ok: false, error: "id is required" }, 400);
          if (!date) return json({ ok: false, error: "date is required" }, 400);

          const idx = dates.findIndex((d: any) => d.id === id);
          if (idx === -1) return json({ ok: false, error: "Not found" }, 404);

          const VALID_TYPES_PUT = ["person", "event", "other"];
          // Зберігаємо tags з БД якщо frontend надіслав порожній масив
          const existingTags = dates[idx].tags || [];
          const incomingTags = Array.isArray(tags) ? tags : category ? [category] : undefined;
          const finalTags =
            incomingTags && incomingTags.length > 0
              ? incomingTags
              : existingTags.length > 0
                ? existingTags
                : [];
          dates[idx] = {
            ...dates[idx],
            date,
            type: VALID_TYPES_PUT.includes(type) ? type : dates[idx].type || "other",
            name: name || alias || dates[idx].name || "",
            tags: finalTags,
            notes: notes || "",
            updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
          };

          await env.DB.prepare("UPDATE users SET my_dates = ? WHERE user_id = ?")
            .bind(JSON.stringify({ items: dates }), userId)
            .run();

          return json({ ok: true });
        }

        // DELETE — видалити дату(и)
        if (request.method === "DELETE") {
          const id = url.searchParams.get("id");
          const ids = url.searchParams.get("ids");
          if (!id && !ids) return json({ ok: false, error: "id or ids required" }, 400);

          const toDelete = ids ? ids.split(",").filter(Boolean) : [id!];
          const filtered = dates.filter((d: any) => !toDelete.includes(d.id));
          if (filtered.length === dates.length) return json({ ok: false, error: "Not found" }, 404);

          await env.DB.prepare("UPDATE users SET my_dates = ? WHERE user_id = ?")
            .bind(JSON.stringify({ items: filtered }), userId)
            .run();

          return json({ ok: true, deleted: toDelete.length });
        }

        return json({ ok: false, error: "Method not allowed" }, 405);
      } catch (e: any) {
        console.error("My-dates error:", e);
        return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
