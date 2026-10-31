/**
 * Є-data в адмінці: читання зібраного за період.
 *
 * Шляхи — під `/api/admin/`, тож єдиний адмін-гейт стоїть до них. Ні запису,
 * ні ручного запуску збору: це етап 4 (`docs/SPENDING.md` §3), а поки що
 * панель показує те, що приніс розклад.
 * @module api-dev/src/controllers/spending-admin.controller
 */

import {
  decodeCursor,
  isPeriod,
  type SpendingCursor,
  type SpendingRole,
} from "@wwwuabot/shared/spending";
import {
  latestPeriod,
  readDocuments,
  readLastLoad,
  readOrgs,
  readSyncRows,
  readTransactions,
} from "../services/spending/read";
import { monthWindow } from "../services/spending/config";
import { ensureSpendingTables } from "../services/spending/store";
import { apiLog } from "../shared/logger";
import type { Env } from "../shared/types";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** Відповідь адмінки не кешується: це приватні дані під cookie-сесією. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

function badRequest(error: string): Response {
  return json({ error }, 400);
}

/** Стеля пагінації: адмінка не має права попросити всю таблицю за раз. */
function limitOf(params: URLSearchParams): number {
  const raw = Number(params.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(raw), MAX_LIMIT);
}

/** `null` — параметра немає; `undefined` — параметр є, але некоректний. */
function periodOf(params: URLSearchParams): string | null | undefined {
  const raw = params.get("period");
  if (raw === null || raw === "") return null;
  return isPeriod(raw) ? raw : undefined;
}

/** `null` — курсора немає; `false` — курсор є, але не розбирається. */
function decodeOrFail(raw: string | null): SpendingCursor | null | false {
  if (raw === null || raw === "") return null;
  return decodeCursor(raw) ?? false;
}

async function guard(env: Env, action: () => Promise<Response>): Promise<Response> {
  try {
    await ensureSpendingTables(env.DB);
    return await action();
  } catch (error: unknown) {
    apiLog.error("spending: читання не вдалось", error);
    return json({ error: "Не вдалось прочитати зібрані дані" }, 500);
  }
}

/** `GET /api/admin/spending/overview` — період, свіжість, розпорядники, стан. */
export function handleSpendingOverview(request: Request, env: Env): Promise<Response> {
  return guard(env, async () => {
    const period = periodOf(new URL(request.url).searchParams);
    if (period === undefined) return badRequest("Період має бути YYYY-MM");

    const chosen = period ?? (await latestPeriod(env.DB));
    const [sync, lastLoad] = await Promise.all([
      readSyncRows(env.DB, chosen),
      readLastLoad(env.CONTENT_KV),
    ]);
    if (!chosen) {
      return json({
        period: null,
        from: null,
        to: null,
        capturedAt: null,
        lastLoad,
        orgs: [],
        sync,
      });
    }

    const window = monthWindow(chosen);
    const orgs = await readOrgs(env.DB, chosen);
    const capturedAt =
      sync
        .flatMap((row) => (row.status === "ok" && row.finishedAt ? [row.finishedAt] : []))
        .sort()
        .pop() ?? null;

    return json({
      period: chosen,
      from: window.from,
      to: window.to,
      capturedAt,
      lastLoad,
      orgs,
      sync,
    });
  });
}

/** `GET /api/admin/spending/sync` — стан збору окремо від даних. */
export function handleSpendingSync(request: Request, env: Env): Promise<Response> {
  return guard(env, async () => {
    const period = periodOf(new URL(request.url).searchParams);
    if (period === undefined) return badRequest("Період має бути YYYY-MM");
    const chosen = period ?? (await latestPeriod(env.DB));
    return json({
      period: chosen,
      rows: await readSyncRows(env.DB, chosen),
      lastLoad: await readLastLoad(env.CONTENT_KV),
    });
  });
}

/** `GET /api/admin/spending/documents?edrpou=…` — договори розпорядника. */
export function handleSpendingDocuments(request: Request, env: Env): Promise<Response> {
  return guard(env, async () => {
    const params = new URL(request.url).searchParams;
    const edrpou = (params.get("edrpou") ?? "").trim();
    if (!/^\d{8,10}$/.test(edrpou)) return badRequest("Потрібен ЄДРПОУ розпорядника");

    const period = periodOf(params);
    if (period === undefined) return badRequest("Період має бути YYYY-MM");
    const cursor = decodeOrFail(params.get("cursor"));
    if (cursor === false) return badRequest("Курсор не розібрано");

    return json(await readDocuments(env.DB, { edrpou, period, limit: limitOf(params), cursor }));
  });
}

/** `GET /api/admin/spending/transactions?edrpou=…&role=payer|recipt`. */
export function handleSpendingTransactions(request: Request, env: Env): Promise<Response> {
  return guard(env, async () => {
    const params = new URL(request.url).searchParams;
    const edrpou = (params.get("edrpou") ?? "").trim();
    if (!/^\d{8,10}$/.test(edrpou)) return badRequest("Потрібен ЄДРПОУ розпорядника");

    const rawRole = params.get("role") ?? "payer";
    if (rawRole !== "payer" && rawRole !== "recipt") {
      return badRequest("Роль — payer або recipt");
    }
    const role: SpendingRole = rawRole;

    const period = periodOf(params);
    if (period === undefined) return badRequest("Період має бути YYYY-MM");
    const cursor = decodeOrFail(params.get("cursor"));
    if (cursor === false) return badRequest("Курсор не розібрано");

    return json(
      await readTransactions(env.DB, { edrpou, role, period, limit: limitOf(params), cursor }),
    );
  });
}
