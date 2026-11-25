/**
 * Підписаний `initData` для перегляду сторінки без Telegram.
 *
 * Це підпис **власника**: у `dev` його видає лише запит із секретом
 * `PREVIEW_SESSION_KEY` (`X-Preview-Key`), без секрету — 404.
 *
 * @module api-dev/src/controllers/preview-session.controller
 */

import type { Env } from "../shared/types";
import { parseOwnerTelegramId } from "@wwwuabot/shared/security/access";
import { signPreviewInitData } from "@wwwuabot/shared/security/preview-session";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Найкоротший ключ: коротший перебирається, а на кону підпис власника. */
const KEY_MIN_LENGTH = 32;

/** Порівняння без раннього виходу: довжина відома, решта — за один прохід. */
function sameKey(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < given.length; index += 1) {
    difference |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export async function handlePreviewSession(request: Request, env: Env): Promise<Response> {
  if (env.ENVIRONMENT !== "dev") return json({ ok: false, error: "Not found" }, 404);

  // Секрет не заданий — ендпоінта немає. Це стан за замовчуванням: дев-воркер
  // задеплоєний публічно, і «поки не налаштували» не має означати «відкрито».
  const key = env.PREVIEW_SESSION_KEY?.trim() ?? "";
  if (key.length < KEY_MIN_LENGTH) return json({ ok: false, error: "Not found" }, 404);

  const given = request.headers.get("X-Preview-Key")?.trim() ?? "";
  if (!sameKey(given, key)) return json({ ok: false, error: "Not found" }, 404);

  const token = env.BOT_TOKEN;
  if (!token) return json({ ok: false, error: "Preview is not configured" }, 503);

  const ownerId = parseOwnerTelegramId(env.ADMIN_TELEGRAM_ID);
  if (ownerId === null) return json({ ok: false, error: "Preview is not configured" }, 503);

  return json({ ok: true, initData: await signPreviewInitData(token, ownerId) });
}
