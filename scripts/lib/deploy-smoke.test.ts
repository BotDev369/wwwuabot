/**
 * Доказ, що смоук деплою ловить поломки, під які написаний: локальний сервер
 * віддає ту саму оболонку з однією зламаною річчю, і кожна поломка мусить дати
 * свою проблему. Живого деплою тест не торкається — лише 127.0.0.1.
 * @module scripts/lib/deploy-smoke.test
 */

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { smokeHealthDeep, smokeShell } from "./deploy-smoke.mjs";

/** CSP доброї оболонки: та сама форма, що в `dist/client/_headers`. */
const CSP = "default-src 'self'; script-src 'self' https://telegram.org";
const JS = "text/javascript; charset=utf-8";
const CSS = "text/css; charset=utf-8";

/** Який файл ламає варіант: решта варіантів мають звичайний `app`. */
const ASSETS: Record<string, string> = {
  "asset-404": "gone",
  "asset-empty": "empty",
  "asset-type": "wrong",
  "asset-reset": "dropped",
};

/** Сторінка з `#root` і своїми файлами; `root: false` — поломка «немає #root». */
function page(variant: string, root = true, file = "app") {
  const html = root ? '<div id="root"></div>' : '<div id="app"></div>';
  return (
    `<!doctype html><html><head><link rel="stylesheet" href="/${variant}/app.css"></head>` +
    `<body>${html}<script type="module" src="/${variant}/${file}.js"></script></body></html>`
  );
}

/** Скільки разів відповіли 5xx на адресу: треба, щоб 503 був саме першою відповіддю. */
const failed = new Map<string, number>();

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://fixture").pathname;
  const [variant = "", file = ""] = pathname.split("/").slice(1);
  const send = (status: number, type: string, body: string, extra = {}) => {
    response.writeHead(status, { "content-type": type, ...extra });
    response.end(body);
  };
  const document = (headers: Record<string, string>) =>
    send(
      200,
      "text/html; charset=utf-8",
      page(variant, variant !== "no-root", ASSETS[variant] ?? "app"),
      headers,
    );

  // Мережа: сокет рветься на кожній спробі — повтор не рятує, трейсбеку бути не має.
  if (variant === "reset" && file === "") return request.socket.destroy();

  // Глибокий health: код і тіло перевіряються разом, тому варіанти окремі.
  if (variant === "deep") {
    if (file === "reset") return request.socket.destroy();
    if (file === "broken")
      return send(
        503,
        "application/json",
        JSON.stringify({ status: "degraded", checks: { db: false, kv: true } }),
      );
    if (file === "empty") return send(200, "application/json", JSON.stringify({ status: "ok" }));
    // 200 при мертвій залежності: код каже «живо», тіло — ні.
    if (file === "soft")
      return send(
        200,
        "application/json",
        JSON.stringify({ status: "ok", checks: { db: true, kv: false } }),
      );
    if (file === "html") return send(200, "text/html; charset=utf-8", "<!doctype html><p>ok");
    return send(
      200,
      "application/json",
      JSON.stringify({ status: "ok", checks: { db: true, kv: true } }),
    );
  }

  // Документ за адресою з версією: так жива платформа веде на `?v=`.
  if (variant === "start") return send(302, "text/plain", "", { location: "/good/?v=1" });

  // 5xx: перша відповідь падає, друга — ні (або падають обидві).
  if ((variant === "retry-once" || variant === "retry-always") && file === "") {
    const misses = (failed.get(pathname) ?? 0) + 1;
    failed.set(pathname, misses);
    if (variant === "retry-always" || misses === 1) return send(503, "text/plain", "");
    return document({ "cache-control": "no-store", "content-security-policy": CSP });
  }

  // Асети: зламана копія ламає лише свій файл, решта — як у живої.
  if (file.endsWith(".js") || file.endsWith(".css")) {
    const type = file.endsWith(".css") ? CSS : JS;
    if (file === "gone.js") return send(404, JS, "");
    if (file === "dropped.js") return request.socket.destroy();
    if (file === "empty.js") return send(200, type, "");
    if (file === "wrong.js") return send(200, "text/plain", "console.log(1)");
    return send(200, type, file.endsWith(".css") ? ".root{display:block}" : "console.log(1)");
  }

  // Застосунок віддано з чужим типом — решта сторінки нормальна.
  if (variant === "json")
    return send(200, "application/json", page(variant), {
      "cache-control": "no-store",
      "content-security-policy": CSP,
    });

  // Три гілки без власного варіанта сторінки: без `'self'`, без типу, без асетів.
  if (variant === "no-self")
    return document({
      "cache-control": "no-store",
      "content-security-policy": "default-src 'self'; script-src https://telegram.org",
    });
  if (variant === "no-type") {
    response.writeHead(200, { "cache-control": "no-store", "content-security-policy": CSP });
    return response.end(page(variant));
  }
  if (variant === "no-assets")
    return send(200, "text/html; charset=utf-8", '<!doctype html><div id="root"></div>', {
      "cache-control": "no-store",
      "content-security-policy": CSP,
    });

  const headers: Record<string, string> = {
    "content-security-policy":
      variant === "unsafe-inline" ? "default-src 'self'; script-src 'self' 'unsafe-inline'" : CSP,
  };
  if (variant !== "no-cache") headers["cache-control"] = "no-store";
  return document(headers);
});

let base = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

/** Одна копія оболонки на сервері-фікстурі. */
const check = (path: string, version = false) =>
  smokeShell({ name: "фікстура", url: `${base}${path}`, version });

describe("смоук деплою на фікстурах", () => {
  it("добра оболонка не дає жодної проблеми", async () => {
    const platform = await smokeShell({
      name: "платформа",
      url: `${base}/good/?v=1`,
      version: true,
    });
    const admin = await smokeShell({ name: "адмінка", url: `${base}/good/`, version: false });
    const redirected = await smokeShell({ name: "редірект", url: `${base}/start`, version: true });

    for (const shell of [platform, admin, redirected]) expect(shell.problems).toEqual([]);
    expect(platform.assets).toBe(2);
  });

  it("документ без #root", async () => {
    expect((await check("/no-root/")).problems).toEqual([
      "у документі немає #root — це не застосунок",
    ]);
  });

  it("script-src з 'unsafe-inline'", async () => {
    expect((await check("/unsafe-inline/")).problems).toEqual([
      "script-src дозволяє 'unsafe-inline'",
    ]);
  });

  it("документ без no-store", async () => {
    expect((await check("/no-cache/")).problems).toEqual([
      "документ кешується («без Cache-Control») — WebView покаже старий бандл",
    ]);
  });

  it("платформа без ?v=", async () => {
    expect((await check("/good/", true)).problems).toEqual([
      "документ без ?v= — версія деплою не дійшла до воркера",
    ]);
  });

  it("асет віддає 404", async () => {
    expect((await check("/asset-404/")).problems).toEqual(["/asset-404/gone.js → 404"]);
  });

  it("асет із порожнім тілом", async () => {
    expect((await check("/asset-empty/")).problems).toEqual(["/asset-empty/empty.js порожній"]);
  });

  it("асет не того типу", async () => {
    expect((await check("/asset-type/")).problems).toEqual([
      "/asset-type/wrong.js типу «text/plain», а не javascript",
    ]);
  });

  it("документ не text/html", async () => {
    expect((await check("/json/")).problems).toEqual([
      "документ типу «application/json», а не text/html",
    ]);
  });

  it("документ без content-type", async () => {
    expect((await check("/no-type/")).problems).toEqual([
      "документ типу «без типу», а не text/html",
    ]);
  });

  it("script-src без 'self'", async () => {
    expect((await check("/no-self/")).problems).toEqual([
      "script-src без 'self' — бандл не завантажиться",
    ]);
  });

  it("документ без жодного свого асета", async () => {
    expect((await check("/no-assets/")).problems).toEqual([
      "у документі немає жодного свого .js/.css",
    ]);
  });

  it("503 лише раз — повтор дістає добру відповідь", async () => {
    expect((await check("/retry-once/")).problems).toEqual([]);
  });

  it("503 обидва рази — проблема є", async () => {
    expect((await check("/retry-always/")).problems).toEqual(["документ → 503"]);
  });

  it("мережа впала на документі — рядок проблеми, а не трейсбек", async () => {
    const shell = await check("/reset/");
    expect(shell.problems).toHaveLength(1);
    expect(shell.problems[0]).toMatch(/^документ не отримано — \S/);
    expect(shell.problems[0]).not.toContain("\n");
    expect(shell.assets).toBe(0);
  });

  it("мережа впала на асеті — рядок проблеми, а не трейсбек", async () => {
    const shell = await check("/asset-reset/");
    expect(shell.problems).toHaveLength(1);
    expect(shell.problems[0]).toMatch(/^\/asset-reset\/dropped\.js не отримано — \S/);
    expect(shell.problems[0]).not.toContain("\n");
  });
});

describe("глибокий health на фікстурах", () => {
  const deep = (path: string) => smokeHealthDeep(`${base}/deep/${path}`);

  it("D1 і KV живі — 0 проблем", async () => {
    expect((await deep("ok")).problems).toEqual([]);
  });

  it("503 називає залежність, а не лише код", async () => {
    expect((await deep("broken")).problems).toEqual(["→ 503, лежить: db"]);
  });

  it("200 із мертвою залежністю — тіло важливіше за код", async () => {
    expect((await deep("soft")).problems).toEqual(["200, але не живі: kv"]);
  });

  it("200 без checks — відповідь не від того ендпоїнта", async () => {
    expect((await deep("empty")).problems).toEqual([
      "у відповіді немає жодної залежності (db, kv)",
    ]);
  });

  it("200 із HTML замість JSON — теж проблема", async () => {
    expect((await deep("html")).problems).toEqual(["у відповіді немає жодної залежності (db, kv)"]);
  });

  it("мережа впала — рядок проблеми, а не трейсбек", async () => {
    const result = await deep("reset");
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toMatch(/^не отримано — \S/);
    expect(result.problems[0]).not.toContain("\n");
  });
});
