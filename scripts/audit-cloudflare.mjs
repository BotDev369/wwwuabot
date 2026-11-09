#!/usr/bin/env node
/**
 * Тижневий зріз витрат Cloudflare: воркери, D1, R2, KV — одним запуском.
 * Числа для аудиту міряли руками, і через це датасети змішувались (два різні
 * підсумки `rows_read` за той самий тиждень). Вікно закінчується вчора:
 * аналітика Cloudflare відстає приблизно на добу.
 * Запуск: `npm run audit:cloudflare [-- --days=14]`.
 * @module scripts/audit-cloudflare
 */

const API = "https://api.cloudflare.com/client/v4/graphql";
const DAY = 86_400_000;
const QUOTA = { workerRequestsPerDay: 100_000, d1RowsReadPerDay: 5_000_000 };
const number = new Intl.NumberFormat("uk-UA");

function dayMinus(days) {
  return new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
}

/** Усі дні вікна включно; `Date.parse` у UTC, щоб пояс не зсував межі. */
function daysBetween(from, to) {
  const days = [];
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= Date.parse(`${to}T00:00:00Z`);) {
    days.push(new Date(time).toISOString().slice(0, 10));
    time += DAY;
  }
  return days;
}

function asDate(day) {
  return day.split("-").reverse().join(".");
}

function megabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function parseDays(argv) {
  const arg = argv.find((one) => one.startsWith("--days="));
  if (!arg) return 7;
  const days = Number(arg.slice("--days=".length));
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    console.error("✗ --days мусить бути цілим від 1 до 90.");
    process.exit(1);
  }
  return days;
}

async function gql(query) {
  const response = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message ?? "GraphQL error");
  return body.data;
}

function queryOf(from, to, account) {
  const filter = `filter: {date_geq: "${from}", date_leq: "${to}"}`;
  return `query {
  viewer { accounts(filter: {accountTag: "${account}"}) {
    workers: workersInvocationsAdaptive(limit: 5000, ${filter}) {
      sum { requests cpuTimeUs errors }
      dimensions { scriptName date }
    }
    d1: d1AnalyticsAdaptiveGroups(limit: 500, ${filter}) {
      sum { rowsRead rowsWritten }
      dimensions { date }
    }
    d1Queries: d1QueriesAdaptiveGroups(limit: 1000, ${filter}) {
      count
      sum { rowsRead }
      dimensions { query }
    }
    r2: r2OperationsAdaptiveGroups(limit: 5000, ${filter}) {
      sum { requests responseBytes }
      dimensions { actionType date }
    }
    kv: kvOperationsAdaptiveGroups(limit: 2000, ${filter}) {
      count
      dimensions { actionType date }
    }
  } }
}`;
}

function addTo(map, key, value) {
  map.set(key, (map.get(key) ?? 0) + value);
  return map;
}

function peakOf(perDay) {
  let peak = { day: "—", value: 0 };
  for (const [day, value] of perDay) if (value > peak.value) peak = { day, value };
  return peak;
}

function share(value, quota) {
  return `${((value / quota) * 100).toFixed(1)} %`;
}

function printWorkers(rows) {
  const byScript = new Map();
  for (const row of rows) {
    const name = row.dimensions.scriptName ?? "(без імені)";
    const one = byScript.get(name) ?? { requests: 0, cpuUs: 0, errors: 0, perDay: new Map() };
    one.requests += row.sum.requests;
    one.cpuUs += row.sum.cpuTimeUs;
    one.errors += row.sum.errors;
    addTo(one.perDay, row.dimensions.date, row.sum.requests);
    byScript.set(name, one);
  }

  const list = [...byScript.entries()].sort((a, b) => b[1].requests - a[1].requests);
  const width = Math.max(6, ...list.map(([name]) => name.length));
  const total = list.reduce((sum, [, one]) => sum + one.requests, 0);
  let busiest = { day: "—", value: 0 };
  for (const [, one] of list) {
    const peak = peakOf(one.perDay);
    if (peak.value > busiest.value) busiest = peak;
  }

  console.log("Воркери:");
  console.log(
    `  ${"скрипт".padEnd(width)} ${"запити".padStart(8)} ${"CPU, с".padStart(7)} ${"сер. CPU".padStart(9)}`,
  );
  for (const [name, one] of list) {
    const average = one.requests ? one.cpuUs / one.requests / 1000 : 0;
    console.log(
      `  ${name.padEnd(width)} ${number.format(one.requests).padStart(8)} ` +
        `${(one.cpuUs / 1e6).toFixed(2).padStart(7)} ${`${average.toFixed(2)} мс`.padStart(9)}`,
    );
  }
  console.log(
    `  разом ${number.format(total)} запитів; пік ${number.format(busiest.value)} за ` +
      `${asDate(busiest.day)} — ${share(busiest.value, QUOTA.workerRequestsPerDay)} від 100 000 на добу`,
  );
}

/** SQL одним рядком: у звіті він має бути підписом, а не полотном. */
function oneLine(sql) {
  const text = String(sql).replace(/\s+/g, " ").trim();
  return text.length > 88 ? `${text.slice(0, 87)}…` : text;
}

function printD1(rows, queries) {
  let read = 0;
  let written = 0;
  const perDay = new Map();
  for (const row of rows) {
    read += row.sum.rowsRead;
    written += row.sum.rowsWritten;
    addTo(perDay, row.dimensions.date, row.sum.rowsRead);
  }

  const peak = peakOf(perDay);
  console.log("D1:");
  console.log(`  прочитано ${number.format(read)} рядків, записано ${number.format(written)}`);
  console.log(
    `  пік читання ${number.format(peak.value)} за ${asDate(peak.day)} — ` +
      `${share(peak.value, QUOTA.d1RowsReadPerDay)} від 5 000 000 на добу`,
  );

  // Той самий рядок `rows_read` може з'їсти один запит — без розрізу пік
  // виглядає як «база багато читає», і шукати причину доводиться руками.
  const byQuery = new Map();
  for (const row of queries) {
    const one = byQuery.get(row.dimensions.query) ?? { rows: 0, runs: 0 };
    one.rows += row.sum.rowsRead;
    one.runs += row.count;
    byQuery.set(row.dimensions.query, one);
  }
  const list = [...byQuery.entries()].sort((a, b) => b[1].rows - a[1].rows);
  if (list.length === 0) return;

  const top = list.slice(0, 8);
  const topRows = top.reduce((sum, [, one]) => sum + one.rows, 0);
  const part = read ? ((topRows / read) * 100).toFixed(1) : "0.0";
  console.log(
    `  топ-${top.length} розрізів: ${number.format(topRows)} рядків — ${part} % усіх читань`,
  );
  for (const [sql, one] of top) {
    console.log(
      `    ${number.format(one.rows).padStart(10)} / ${String(one.runs).padStart(5)} зап. | ${oneLine(sql)}`,
    );
  }
}

function printR2(rows) {
  const byAction = new Map();
  for (const row of rows) {
    const one = byAction.get(row.dimensions.actionType) ?? { requests: 0, bytes: 0 };
    one.requests += row.sum.requests;
    one.bytes += row.sum.responseBytes;
    byAction.set(row.dimensions.actionType, one);
  }

  console.log("R2:");
  const list = [...byAction.entries()].sort((a, b) => b[1].requests - a[1].requests);
  if (list.length === 0) console.log("  операцій не було");
  for (const [action, one] of list) {
    const size = one.bytes > 0 ? `, ${megabytes(one.bytes)}` : "";
    console.log(`  ${action}: ${number.format(one.requests)} запитів${size}`);
  }
}

function printKV(rows) {
  const byAction = new Map();
  for (const row of rows) addTo(byAction, row.dimensions.actionType, row.count);

  console.log("KV:");
  const list = [...byAction.entries()].sort((a, b) => b[1] - a[1]);
  if (list.length === 0) console.log("  операцій не було");
  for (const [action, count] of list) console.log(`  ${action}: ${number.format(count)}`);
}

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) {
    console.error(
      "✗ Немає CLOUDFLARE_API_TOKEN або CLOUDFLARE_ACCOUNT_ID у оточенні — " +
        "без них аналітику не прочитати. Значення скрипт не друкує і не питає.",
    );
    process.exit(1);
  }

  const days = parseDays(process.argv.slice(2));
  const to = dayMinus(1);
  const from = dayMinus(days);
  const body = await gql(queryOf(from, to, account));
  const scope = body.viewer?.accounts?.[0];
  if (!scope) throw new Error("акаунт не знайдено — перевір CLOUDFLARE_ACCOUNT_ID");

  const window = daysBetween(from, to);
  console.log(
    `Cloudflare, ${asDate(from)}–${asDate(to)} (${window.length} днів; вікно закінчується вчора, ` +
      "бо аналітика відстає приблизно на добу)\n",
  );
  printWorkers(scope.workers ?? []);
  console.log("");
  printD1(scope.d1 ?? [], scope.d1Queries ?? []);
  console.log("");
  printR2(scope.r2 ?? []);
  console.log("");
  printKV(scope.kv ?? []);
}

try {
  await main();
} catch (error) {
  console.error(`✗ Не вдалось прочитати аналітику Cloudflare: ${error.message}`);
  process.exitCode = 1;
}
