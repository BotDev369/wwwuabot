/**
 * Підписаний `initData` для перегляду сторінки без Telegram.
 *
 * Поза `ENVIRONMENT === "dev"` — 404, і підписується лише власник
 * (`ADMIN_TELEGRAM_ID`), а не будь-який id.
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

export async function handlePreviewSession(env: Env): Promise<Response> {
  if (env.ENVIRONMENT !== "dev") return json({ ok: false, error: "Not found" }, 404);

  const token = env.BOT_TOKEN;
  if (!token) return json({ ok: false, error: "Preview is not configured" }, 503);

  const ownerId = parseOwnerTelegramId(env.ADMIN_TELEGRAM_ID);
  if (ownerId === null) return json({ ok: false, error: "Preview is not configured" }, 503);

  return json({ ok: true, initData: await signPreviewInitData(token, ownerId) });
}
