/**
 * Аудит КИРПИЧИКІВ: не таблиць окремо, а кожної поверхні продукту.
 *
 * Сторінки не виписані руками: платформа бере рядки з бази сценаріїв
 * (`backups/dev-scenarios-*.json`), адмінка — маршрути з `app/router.tsx`.
 * Тому нова сторінка потрапляє в перевірку сама, без правки цього файлу.
 *
 * Що міряємо на кожній поверхні (обидві теми, телефон і десктоп):
 *
 *   1. docX        — сторінка їде вбік (документ ширший за вікно);
 *   2. offscreen   — елемент виходить за екран ліворуч/праворуч, хоч усередині
 *                    нього немає жодного скролера (лотерея з `sticky left: 0`);
 *   3. chrome      — липкий/фіксований хром вилазить за межі екрана;
 *   4. scroller    — горизонтальний скролер, який не є кирпичиком (`wb-table-scroll`
 *                    тощо): приватний скролер на сторінці — це дефект;
 *   5. clipped     — текст обрізано `overflow: hidden` без скролера й без `…`;
 *   6. tap         — інтерактивна ціль менша за 24×24 (палець не влучить);
 *   7. class       — клас поза простором `wb-*` (приватний стиль сторінки);
 *   8. inline      — інлайновий `style` у розмітці (вигляд живе в CSS).
 *
 * Фікстури підкладаються в мережу: сторінки працюють своїм кодом.
 *
 * Запуск:
 *   export LD_LIBRARY_PATH=$HOME/.local/chrome-libs/usr/lib/x86_64-linux-gnu \
 *          FONTCONFIG_FILE=$HOME/.local/fonts/fonts.conf FONTCONFIG_PATH=$HOME/.local/fonts
 *   THEME=dark|light APPS=admin|platform|admin,platform \
 *   [VIEWPORT=360] [PAGE=<slug маршруту>] node artifacts/audit-bricks.mjs
 */
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const exec = `${homedir()}/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = "artifacts/shots/bricks";
mkdirSync(OUT, { recursive: true });

const ONLY = process.env.APPS ?? "admin,platform";
const THEME = process.env.THEME ?? "dark";
const VIEWPORT = Number(process.env.VIEWPORT ?? 360);
const ONLY_PAGE = process.env.PAGE ?? "";

// ── база сценаріїв ─────────────────────────────────────────────────
const BACKUP = readdirSync("backups")
  .filter((n) => /^dev-scenarios-.*\.json$/.test(n))
  .sort()
  .at(-1);
const scenarioRows = JSON.parse(readFileSync(`backups/${BACKUP}`, "utf8"))[0].results;

/** Рядки, у яких є сторінка (`page_data`), — саме вони й аудируються. */
const scenarioPages = scenarioRows
  .map((row) => {
    let pageData = null;
    try {
      pageData = JSON.parse(row.page_data ?? "null");
    } catch {
      pageData = null;
    }
    const blocks = pageData?.zones ? Object.values(pageData.zones).flat().filter(Boolean) : [];
    return { slug: String(row.slug ?? ""), blocks };
  })
  .filter((p) => p.blocks.length > 0);

// ── статичний сервер адмінки ───────────────────────────────────────
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
function serve(root, port) {
  return new Promise((resolve) => {
    createServer((req, res) => {
      const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]));
      let file = join(root, path);
      if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
      res.setHeader("Content-Type", TYPES[extname(file)] ?? "application/octet-stream");
      createReadStream(file).pipe(res);
    }).listen(port, "0.0.0.0", resolve);
  });
}

// ── фікстури ───────────────────────────────────────────────────────
const SPEND = new URL("fixtures/", import.meta.url).pathname;
const spendFixtures = new Map(
  readdirSync(SPEND).map((n) => [
    `/${n.replace(/\.json$/, "")}`,
    readFileSync(`${SPEND}${n}`, "utf8"),
  ]),
);
function spendingBody(url) {
  const tail = url.split("/api/admin/spending/")[1] ?? "";
  const path = tail.split("?")[0];
  const query = tail.split("?")[1] ?? "";
  const period = /period=([\d-]+)/.exec(query)?.[1] ?? "";
  const scope = /scope=(\w+)/.exec(query)?.[1] ?? "";
  if (path === "overview")
    return (
      spendFixtures.get(`/overview_period_${period}`) ??
      spendFixtures.get("/overview_period_2026-10")
    );
  if (path === "codes")
    return (
      spendFixtures.get(`/codes_period_${period}`) ?? spendFixtures.get("/codes_period_2026-10")
    );
  if (path === "recipients")
    return (
      spendFixtures.get(`/recipients_scope_${scope}`) ??
      spendFixtures.get("/recipients_scope_month")
    );
  if (path === "sync")
    return spendFixtures.get(`/sync_period_${period}`) ?? spendFixtures.get("/sync_period_2026-10");
  if (path === "transactions")
    return spendFixtures.get(`/transactions_role_payer_period_${period}_limit_50`);
  if (path === "documents")
    return spendFixtures.get(`/documents_period_${period}_limit_50_edrpou_34357364`);
  return null;
}

const USERS = [
  {
    user_id: 7,
    first_name: "Сергій",
    last_name: "Дискант",
    username: "DiskantSergiy",
    language: "uk",
    created_at: "2026-09-01 10:00:00",
    is_blocked: 0,
    role: "admin",
    tariff: "pro",
    status: "active",
    discount: 0,
    permissions: "[]",
  },
  {
    user_id: 8,
    first_name: "Олена",
    last_name: "Коваленко-Гриценко",
    username: "olena_kovalenko",
    language: "uk",
    created_at: "2026-08-14 18:20:00",
    is_blocked: 0,
    role: "moderator",
    tariff: "basic",
    status: "active",
    discount: 10,
    permissions: "[]",
  },
];
const ACCESS = [
  {
    id: 12,
    user_id: 4409,
    text: "Добрий день! Хочу отримати доступ до платформи, бо цікавлюся сценаріями та аналізом дат.",
    created_at: "2026-10-01 09:00:00",
    first_name: "Оксана",
    last_name: "Гриценко",
    username: "oksana_g",
    platform_username: "#oksana",
  },
];
const SCENARIOS = scenarioRows.map((r) => ({
  slug: r.slug,
  rich_message: r.rich_message,
  updated_at: r.updated_at,
}));
const SCENARIO_ROW = {
  ...scenarioRows.find((r) => r.slug === "viruvannia-a1"),
  page_data: scenarioRows.find((r) => r.slug === "viruvannia-a1")?.page_data ?? null,
};

const metrics = (seed) => ({
  "total|code.size_bytes": 2_400_000 + seed * 1000,
  "total|code.lines": 41_000 + seed * 10,
  "total|code.files": 310 + seed,
  "total|github.stars": 4,
  "total|github.forks": 1,
  "total|github.open_issues": 0,
});
const MON = {
  sources: {
    repo: "BotDev369/wwwuabot",
    githubTokenConfigured: false,
    cloudflareConfigured: true,
    cronSchedule: "0 3 * * *",
  },
  latest: {
    id: 9,
    collectedAt: "2026-11-05T03:00:00.000Z",
    trigger: "cron",
    status: "ok",
    ref: "1b51ec5ff001",
    collectors: [
      { id: "code", label: "Код", status: "ok", durationMs: 812 },
      { id: "github", label: "GitHub", status: "skipped", durationMs: 3, message: "токена немає" },
    ],
    values: [
      { group: "total", metric: "code.size_bytes", value: 2_404_000 },
      { group: "total", metric: "code.lines", value: 41_090 },
      { group: "total", metric: "code.files", value: 312 },
      { group: "total", metric: "github.stars", value: 4 },
      { group: "api-dev", metric: "code.size_bytes", value: 900_000 },
      { group: "api-dev", metric: "code.lines", value: 15_000 },
      { group: "packages", metric: "code.size_bytes", value: 670_000 },
      { group: "packages", metric: "code.lines", value: 11_400 },
      { group: "web-admin-dev", metric: "code.size_bytes", value: 520_000 },
      { group: "web-admin-dev", metric: "code.lines", value: 9_200 },
    ],
  },
  previous: {
    id: 8,
    collectedAt: "2026-11-04T03:00:00.000Z",
    trigger: "cron",
    status: "partial",
    ref: "ce81bb01122a",
    collectors: [{ id: "code", label: "Код", status: "ok", durationMs: 790 }],
    values: [
      { group: "total", metric: "code.size_bytes", value: 2_390_000 },
      { group: "total", metric: "code.lines", value: 40_800 },
      { group: "total", metric: "code.files", value: 310 },
    ],
  },
  history: [
    {
      id: 7,
      collectedAt: "2026-11-03T03:00:00.000Z",
      status: "ok",
      trigger: "cron",
      ref: "a9c7d3e01234",
      totals: metrics(0),
    },
    {
      id: 8,
      collectedAt: "2026-11-04T03:00:00.000Z",
      status: "partial",
      trigger: "manual",
      ref: null,
      totals: metrics(1),
    },
    {
      id: 9,
      collectedAt: "2026-11-05T03:00:00.000Z",
      status: "ok",
      trigger: "cron",
      ref: "1b51ec5ff001",
      totals: metrics(2),
    },
  ],
};

function adminBody(url) {
  const u = new URL(url);
  const path = u.pathname;
  const j = (v) => ({ contentType: "application/json", body: JSON.stringify(v) });
  if (path === "/auth/check" || path === "/auth/me")
    return j({ authenticated: true, expiresAt: null });
  if (path.startsWith("/api/admin/spending")) {
    const body = spendingBody(url);
    return body ? { contentType: "application/json", body } : null;
  }
  if (path === "/api/admin/users/list") return j({ success: true, items: USERS });
  if (path === "/api/admin/users/read") return j({ success: true, data: USERS[0] });
  if (path === "/api/admin/access-requests") return j({ ok: true, items: ACCESS });
  if (path === "/api/admin/monitoring/summary") return j(MON);
  if (path.startsWith("/api/portal/scenarios"))
    return j({ success: true, items: SCENARIOS, data: SCENARIO_ROW });
  if (path.startsWith("/api/bot/")) return j({ ok: true, username: "wwwuabot", name: "WWWUABot" });
  return j({ ok: true, success: true, items: [], data: null });
}

const MY_DATES = [
  {
    id: "1",
    date: "1980-03-03",
    name: "День народження",
    type: "personal",
    tags: ["родина"],
    about: "Ключова дата",
  },
  {
    id: "2",
    date: "1990-05-05",
    name: "Переїзд",
    type: "event",
    tags: ["зміни"],
    about: "Новий етап",
  },
];
const SYSTEMS = [
  {
    id: "kram",
    name: "Крам",
    implemented: true,
    description: "Система аналізу дат",
    parameters: [{ key: "kram.sign", label: "Знак Сонця" }],
  },
];
const COMPARE = {
  ok: true,
  matrix: { "1980-03-03": { kram: { "kram.sign": "Рак" } } },
  details: { "1980-03-03": { kram: { "kram.sign": { about: "Рак" } } } },
  names: { "1980-03-03": "День народження" },
};

function platformBody(url) {
  const u = new URL(url);
  const path = u.pathname;
  const j = (v) => ({ contentType: "application/json", body: JSON.stringify(v) });
  if (path === "/api/user/access") return j({ allowed: true });
  /* Трекери читають `trackers`, а не `items`: без масиву сторінка падає в
     ErrorBoundary, і аудит бачить порожню поверхню замість екрана. */
  if (path.startsWith("/api/user/trackers"))
    return j({
      ok: true,
      trackers: [],
      templates: [],
      groups: [],
      entries: [],
      /* `endDay` — не прикраса: матриця днів будує дати від нього, і без
         рядка сторінка падає на `new Date(undefined)`. */
      endDay: new Date().toISOString().slice(0, 10),
    });
  if (path === "/api/user/profile")
    return j({ ok: true, user: { id: "1", first_name: "Тест", username: "tester" } });
  if (path === "/api/my-dates") return j({ ok: true, dates: MY_DATES });
  if (path === "/api/mydate/systems") return j({ ok: true, systems: SYSTEMS });
  if (path === "/api/mydate/compare") return j(COMPARE);
  if (path.startsWith("/api/scenario/")) {
    const slug = decodeURIComponent(path.slice("/api/scenario/".length)).replace(/\/.*$/, "");
    const row = scenarioRows.find((r) => String(r.slug ?? "") === slug);
    if (!row?.page_data) return j({ ok: false });
    let pageData = null;
    try {
      pageData = JSON.parse(row.page_data);
    } catch {
      pageData = null;
    }
    return j({
      ok: true,
      scenario: {
        id: String(row.id),
        slug: row.slug,
        title: row.title ?? row.slug,
        photo_url: row.photo_url ?? null,
        template_key: null,
      },
      pageData,
    });
  }
  return j({
    ok: true,
    success: true,
    items: [],
    data: null,
    dates: [],
    systems: [],
    trackers: [],
    pages: [],
    notes: [],
    messages: [],
    games: [],
    assessments: [],
    products: [],
    orders: [],
    contacts: [],
    favorites: [],
  });
}

const APPS = {
  admin: {
    port: 4173,
    root: new URL("../web-admin-dev/dist/client/", import.meta.url).pathname,
    body: adminBody,
  },
  platform: { port: 4180, root: null, body: platformBody },
};

// ── поверхні ───────────────────────────────────────────────────────
/** Маршрути адмінки читаються з роутера: нова сторінка не забувається. */
function adminRoutes() {
  const src = readFileSync("web-admin-dev/src/app/router.tsx", "utf8");
  const paths = [...src.matchAll(/path:\s*"([^"]*)"/g)]
    .map((m) => m[1])
    .filter((p) => p && !p.includes(":") && !p.includes("*"));
  return ["/", ...paths.map((p) => `/${p}`)];
}

/** Сторінки сценаріїв + екрани, які не є рядком контенту. */
const SCREEN_ROUTES = [
  "/services",
  "/account",
  "/trackers",
  "/notes",
  "/messages",
  "/pages",
  "/games",
  "/assessments",
  "/research",
];

const pages = [];
if (ONLY.split(",").includes("admin"))
  for (const route of adminRoutes())
    pages.push({
      app: "admin",
      route,
      name: `admin:${route === "/" ? "home" : route.slice(1).replace(/\//g, "-")}`,
    });
if (ONLY.split(",").includes("platform")) {
  for (const p of scenarioPages) {
    const route = p.slug.startsWith("dateanalysis/") ? `/${p.slug}` : `/${p.slug}`;
    pages.push({
      app: "platform",
      route: route === "/" ? "/" : route,
      name: `scenario:${p.slug || "root"}`,
      blocks: p.blocks.length,
    });
  }
  for (const route of SCREEN_ROUTES)
    pages.push({ app: "platform", route, name: `screen:${route.slice(1)}` });
}

// ── що міряємо ─────────────────────────────────────────────────────
const AUDIT = () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out = {
    docX: Math.max(0, Math.round(document.documentElement.scrollWidth - vw)),
    offscreen: [],
    chrome: [],
    scroller: [],
    clipped: [],
    tap: [],
    cls: [],
    inline: [],
  };
  const shown = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.02) return null;
    if (el.closest('[aria-hidden="true"], [hidden], dialog:not([open])')) return null;
    /* Закритий виїзний drawer стоїть за лівим краєм навмисно (`left: -w`):
       людини там немає, і «вилазить за екран» — не про нього. Відкритий
       (`--open`) перевіряється як звичайний хром. */
    if (el.closest(".app-drawer:not(.app-drawer--open)")) return null;
    return { s, r };
  };
  const label = (el) => {
    const cls =
      typeof el.className === "string"
        ? el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}${text ? ` «${text}»` : ""}`;
  };
  const inHScroller = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (/(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 2) return n;
    }
    return null;
  };
  /* Закритий шухлядний хром (меню, дровер, діалог) лежить за екраном
     навмисно: його `transform` / `overflow: hidden` предка його ховає.
     Це не «вилазить»: перевіряємо лише те, що людина справді бачить. */
  const hiddenByClip = (el) => {
    const r = el.getBoundingClientRect();
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (!/(hidden|clip)/.test(`${s.overflowX}${s.overflowY}`)) continue;
      const nr = n.getBoundingClientRect();
      if (
        r.right <= nr.left + 1 ||
        r.left >= nr.right - 1 ||
        r.bottom <= nr.top + 1 ||
        r.top >= nr.bottom - 1
      )
        return true;
    }
    return false;
  };
  const PUSH = (arr, el, extra) => {
    const text = `${label(el)}${extra ? ` ${extra}` : ""}`;
    if (arr.length < 6 && !arr.some((x) => x.el === text)) arr.push({ el: text });
  };
  for (const el of document.querySelectorAll("body *")) {
    const v = shown(el);
    if (!v) continue;
    const { s, r } = v;
    /* 2. Елемент за екраном. Усередині скролера — то його справа. */
    if (r.right > vw + 1 || r.left < -1) {
      if (s.position !== "fixed" && !inHScroller(el) && !hiddenByClip(el)) PUSH(out.offscreen, el);
      /* 3. Липкий хром мусить жити в екрані й не їхати за його край. */
      else if (
        (s.position === "sticky" || s.position === "fixed") &&
        !inHScroller(el) &&
        !hiddenByClip(el)
      )
        PUSH(out.chrome, el);
    }
    /* 4. Горизонтальний скролер — тільки кирпичик. */
    if (/(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 4) {
      const brick =
        /wb-table-scroll|wb-param-scroll|wb-line-tabs|wb-block-|wb-chips|wb-tab|wb-code|wb-pre|wb-drawer/;
      if (!brick.test(String(el.className))) PUSH(out.scroller, el);
    }
    /* 5. Обрізаний текст без скролера й без «…». */
    if (/(hidden|clip)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 4) {
      const clamp = s.webkitLineClamp !== "none" && s.webkitLineClamp !== "";
      const dots = s.textOverflow === "ellipsis";
      if (!clamp && !dots && (el.textContent ?? "").trim().length > 0) PUSH(out.clipped, el);
    }
    /* 6. Ціль під палець. */
    if (
      el.matches('button, a[href], [role="button"], input:not([type="hidden"]), select, textarea')
    ) {
      if ((r.width < 24 || r.height < 24) && !el.closest("label"))
        PUSH(out.tap, el, `${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    /* 7. Клас поза простором кирпичиків. */
    for (const c of el.classList) {
      if (!/^wb-/.test(c) && !/^(is-|has-)/.test(c)) {
        PUSH(out.cls, el);
        break;
      }
    }
    /* 8. Інлайновий вигляд. */
    if (el.getAttribute("style")) PUSH(out.inline, el);
  }
  const flatten = (arr) => arr.map((x) => x.el);
  const bricks = {};
  for (const el of document.querySelectorAll("[class]"))
    for (const c of el.classList)
      if (/^wb-/.test(c)) {
        const key = c.replace(/--.*$/, "");
        bricks[key] = (bricks[key] ?? 0) + 1;
      }
  return {
    docX: out.docX,
    offscreen: flatten(out.offscreen),
    chrome: flatten(out.chrome),
    scroller: flatten(out.scroller),
    clipped: flatten(out.clipped),
    tap: flatten(out.tap),
    cls: flatten(out.cls),
    inline: flatten(out.inline),
    bricks: Object.keys(bricks).length,
    brickList: Object.entries(bricks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
    tables: document.querySelectorAll("table").length,
    height: Math.round(document.documentElement.scrollHeight),
  };
};

const WHY_OFFSCREEN = () => {
  const vw = window.innerWidth;
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || s.display === "none" || s.visibility === "hidden") continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    const chain = [];
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const ns = getComputedStyle(n);
      chain.push(
        `${n.tagName.toLowerCase()}.${String(n.className).slice(0, 26)} ox=${ns.overflowX} px=${ns.position} w=${Math.round(n.getBoundingClientRect().width)} sw=${n.scrollWidth} cw=${n.clientWidth}`,
      );
    }
    return {
      el: `${el.tagName}.${String(el.className).slice(0, 30)}`,
      right: Math.round(r.right),
      left: Math.round(r.left),
      chain: chain.slice(0, 7),
    };
  }
  return null;
};

const browser = await chromium.launch({
  executablePath: exec,
  args: ["--no-sandbox", "--disable-gpu"],
});
for (const [key, app] of Object.entries(APPS)) {
  if (!ONLY.split(",").includes(key)) continue;
  if (app.root) await serve(app.root, app.port);
}

const fails = [];
const rows = [];
for (const c of pages) {
  if (ONLY_PAGE && c.route !== ONLY_PAGE && c.name !== ONLY_PAGE) continue;
  const app = APPS[c.app];
  const ctx = await browser.newContext({
    viewport: { width: VIEWPORT, height: VIEWPORT > 700 ? 900 : 800 },
    deviceScaleFactor: 2,
    isMobile: VIEWPORT <= 700,
    hasTouch: VIEWPORT <= 700,
  });
  await ctx.route(
    (url) => /^\/(api|auth)\//.test(url.pathname),
    (r) => {
      const url = r.request().url();
      if (new URL(url).pathname.startsWith("/auth/"))
        return r.fulfill({ json: { authenticated: true, expiresAt: null } });
      const body = app.body(url);
      if (!body) return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return r.fulfill({ status: 200, ...body });
    },
  );
  const page = await ctx.newPage();
  await page.addInitScript((theme) => {
    localStorage.setItem("wwwuabot-theme", theme);
    const stub = {
      initData: "query_id=AA&user=%7B%22id%22%3A1%7D&hash=fake",
      initDataUnsafe: { user: { id: 1, first_name: "Тест", username: "tester" } },
      colorScheme: theme === "dark" ? "dark" : "light",
      themeParams: {},
      isExpanded: true,
      viewportHeight: 800,
      viewportStableHeight: 800,
      platform: "android",
      version: "7.0",
      ready() {},
      expand() {},
      close() {},
      onEvent() {},
      offEvent() {},
      setHeaderColor() {},
      setBackgroundColor() {},
      setBottomBarColor() {},
      requestViewport() {},
      requestSafeArea() {},
      requestContentSafeArea() {},
      disableVerticalSwipes() {},
      enableClosingConfirmation() {},
      disableClosingConfirmation() {},
      showAlert() {},
      showConfirm() {},
      lockOrientation() {},
      openLink() {},
      BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
      MainButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
      HapticFeedback: { impactOccurred() {}, notificationOccurred() {}, selectionChanged() {} },
      CloudStorage: { getItem() {}, setItem() {}, removeItem() {} },
    };
    try {
      Object.defineProperty(window, "Telegram", {
        configurable: true,
        get: () => ({ WebApp: stub }),
        set: () => {},
      });
    } catch {
      window.Telegram = { WebApp: stub };
    }
  }, THEME);
  await page.goto(`http://127.0.0.1:${app.port}${c.route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const info = await page.evaluate(AUDIT);
  if (process.env.DEBUG && (info.offscreen.length || info.chrome.length))
    console.log("  debug", c.name, JSON.stringify(await page.evaluate(WHY_OFFSCREEN)));
  if (bridgeUnavailable(info)) {
    /* Порожня поверхня — не «все гаразд»: сценарій, який не намалювався,
       теж дефект. Рахуємо це провалом, а не пропуском. */
    fails.push(`${c.name} — порожня поверхня (0 кирпичиків)`);
  }
  await page.screenshot({ path: `${OUT}/${c.name.replace(/[/:]/g, "_")}-${THEME}.png` });
  const reasons = [];
  if (info.docX > 0) reasons.push(`екран їде вбік на ${info.docX}px`);
  if (info.offscreen.length) reasons.push(`за екран: ${info.offscreen.join(" | ")}`);
  if (info.chrome.length) reasons.push(`хром за екраном: ${info.chrome.join(" | ")}`);
  if (info.scroller.length) reasons.push(`приватний скролер: ${info.scroller.join(" | ")}`);
  if (info.clipped.length) reasons.push(`обрізано: ${info.clipped.join(" | ")}`);
  if (info.tap.length) reasons.push(`ціль < 24px: ${info.tap.join(" | ")}`);
  const ok = reasons.length === 0;
  /* Класи поза `wb-*` та інлайнові стилі — борг, а не геометрія: їх
     показуємо окремо, щоб було видно, де поверхня ще не зібрана з кирпичиків,
     але провал робить лише те, що ламає екран. */
  const debt = [];
  if (info.cls.length) debt.push(`клас поза wb-*: ${info.cls.join(" | ")}`);
  if (info.inline.length) debt.push(`інлайн-стиль: ${info.inline.join(" | ")}`);
  rows.push({
    name: c.name,
    ok,
    bricks: info.bricks,
    tables: info.tables,
    h: info.height,
    reasons,
    debt,
    theme: THEME,
  });
  if (!ok) fails.push(`${c.name} — ${reasons.join("; ")}`);
  await ctx.close();
}

function bridgeUnavailable(info) {
  return info.bricks === 0;
}

for (const r of rows) {
  console.log(
    `${r.ok ? "OK  " : "FAIL"} ${r.name} | кирпичиків=${r.bricks} таблиць=${r.tables} h=${r.h}${r.reasons.length ? ` | ${r.reasons.join("; ")}` : ""}`,
  );
  if (r.debt.length) console.log(`     борг: ${r.debt.join("; ")}`);
}
console.log(`\n${THEME} ${VIEWPORT}px: поверхонь ${rows.length}, провалів ${fails.length}`);
for (const f of fails) console.log("✗", f);
await browser.close();
process.exit(fails.length ? 1 : 0);
