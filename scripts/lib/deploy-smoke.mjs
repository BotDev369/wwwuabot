/**
 * Живі поверхні після деплою: оболонки й залежності воркера.
 *
 * `/health` доводить, що `api` відповідає, і нічого — про застосунок: збірка,
 * що не поїхала, дає білий екран при **зеленому** run. Правило й причини —
 * `docs/QUALITY_GATE.md`.
 * @module scripts/lib/deploy-smoke
 */

/**
 * `version` — документ мусить прийти за адресою з версією деплою (`?v=`), інакше
 * WebView лишається зі старим документом (binding `CF_VERSION_METADATA`).
 * В адмінки такої адреси немає — свіжість там тримає `no-store`.
 */
export const SHELLS = [
  { name: "платформа", url: "https://web-platform-dev.diskomate.workers.dev/", version: true },
  { name: "адмінка", url: "https://web-admin-dev.diskomate.workers.dev/", version: false },
];

/** Глибокий health: D1 і KV — те, на чому тримається решта, і чого `/health` не бачить. */
export const HEALTH_DEEP = "https://api-dev.diskomate.workers.dev/health/deep";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET із одним повтором на 5xx: мережева дрібниця не має робити деплой «не підтвердженим». */
async function get(url, init) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(url, init);
      if (res.status < 500 || attempt > 1) return res;
    } catch (error) {
      if (attempt > 1) throw error;
    }
    await sleep(1000);
  }
}

/** Коротка причина збою мережі: справжня помилка `fetch` лежить у `cause`. */
function reason(error) {
  const cause = error?.cause ?? error;
  const first = Array.isArray(cause?.errors) ? cause.errors[0] : cause;
  const text = first?.message || cause?.message || String(first ?? cause);
  return String(text).split("\n")[0].trim() || "невідома причина";
}

/** Одна оболонка: `problems` порожній — вона відкривається. */
export async function smokeShell(shell) {
  const problems = [];
  let page;
  try {
    page = await get(shell.url, { redirect: "follow" });
  } catch (error) {
    // `check:deploy` друкує проблему як «✗ платформа: …»: збій мережі мусить бути
    // рядком, а не трейсбеком, інакше причина тоне в стеку.
    return { name: shell.name, problems: [`документ не отримано — ${reason(error)}`], assets: 0 };
  }
  const html = await page.text();
  const type = page.headers.get("content-type") ?? "";
  const csp = page.headers.get("content-security-policy") ?? "";
  const scriptSrc = csp.split(";").find((part) => part.trim().startsWith("script-src")) ?? "";
  const cache = page.headers.get("cache-control") ?? "";

  // Не 200 — далі перевіряти нічого: порожнє тіло дало б пʼять скарг на одну причину.
  if (page.status !== 200)
    return { name: shell.name, problems: [`документ → ${page.status}`], assets: 0 };
  if (!type.includes("text/html"))
    problems.push(`документ типу «${type || "без типу"}», а не text/html`);
  if (!csp) problems.push("немає Content-Security-Policy — політика не доїхала з `_headers`");
  else if (!/'self'/.test(scriptSrc))
    problems.push("script-src без 'self' — бандл не завантажиться");
  else if (/'unsafe-inline'/.test(scriptSrc)) problems.push("script-src дозволяє 'unsafe-inline'");
  if (!cache.includes("no-store"))
    problems.push(
      `документ кешується («${cache || "без Cache-Control"}») — WebView покаже старий бандл`,
    );
  if (!/id="root"/.test(html)) problems.push("у документі немає #root — це не застосунок");
  if (shell.version && !new URL(page.url).searchParams.get("v"))
    problems.push("документ без ?v= — версія деплою не дійшла до воркера");

  // Свої файли збірки: зовнішній Telegram SDK і `og:image` не рахуються.
  const assets = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map((m) =>
        new URL(m[1], page.url).toString(),
      ),
    ),
  ];
  if (assets.length === 0) problems.push("у документі немає жодного свого .js/.css");

  for (const asset of assets.slice(0, 3)) {
    const path = new URL(asset).pathname;
    let res;
    try {
      res = await get(asset, {});
    } catch (error) {
      problems.push(`${path} не отримано — ${reason(error)}`);
      continue;
    }
    const kind = path.endsWith(".css") ? "text/css" : "javascript";
    const assetType = res.headers.get("content-type") ?? "";
    const size = (await res.arrayBuffer()).byteLength;
    if (res.status !== 200) problems.push(`${path} → ${res.status}`);
    else if (!assetType.includes(kind))
      problems.push(`${path} типу «${assetType || "без типу"}», а не ${kind}`);
    else if (size === 0) problems.push(`${path} порожній`);
  }

  return { name: shell.name, problems, assets: assets.length };
}

/** Усі оболонки одночасно: чотири запити на кожну — це секунди, не хвилини. */
export async function smokeShells() {
  return Promise.all(SHELLS.map(smokeShell));
}

/**
 * Залежності воркера: 503 мусить назвати, що саме лежить.
 *
 * Код без тіла («→ 503») не каже, чи це база, чи кеш — а різниця між ними і є
 * вся робота після пушу.
 */
export async function smokeHealthDeep(url = HEALTH_DEEP) {
  let res;
  try {
    res = await get(url, {});
  } catch (error) {
    return { name: "health/deep", problems: [`не отримано — ${reason(error)}`] };
  }

  const body = await res.json().catch(() => null);
  const checks = body?.checks ?? {};
  const down = Object.entries(checks)
    .filter(([, alive]) => alive !== true)
    .map(([dependency]) => dependency);

  if (res.status !== 200)
    return {
      name: "health/deep",
      problems: [`→ ${res.status}${down.length ? `, лежить: ${down.join(", ")}` : ""}`],
    };
  // Порожній `checks` — це не «все добре», а відповідь не від того ендпоїнта.
  if (down.length > 0)
    return { name: "health/deep", problems: [`200, але не живі: ${down.join(", ")}`] };
  if (Object.keys(checks).length === 0)
    return { name: "health/deep", problems: ["у відповіді немає жодної залежності (db, kv)"] };

  return { name: "health/deep", problems: [] };
}
