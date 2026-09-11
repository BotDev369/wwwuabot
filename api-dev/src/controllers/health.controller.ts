/**
 * Контролер здоров'я воркера.
 *
 * Два різні ендпоїнти, бо це дві різні відповіді:
 *
 *   GET /health       — чи живий сам воркер (без звернень до залежностей);
 *   GET /health/deep  — чи живі залежності (D1 + KV).
 *
 * `/health` свідомо НЕ торкається БД: він мусить бути миттєвим і не залежати
 * від того, що перевіряє. Якщо віддати його зовнішньому монітору, монітор
 * показуватиме «все добре» навіть коли база лежить — тобто даватиме
 * фальшиве заспокоєння. Для моніторингу існує `/health/deep`.
 *
 * @module api-dev/src/controllers/health.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Відповідь здоров'я не можна кешувати: монітор мусить бачити
      // реальний стан, а не результат п'ятихвилинної давнини.
      "Cache-Control": "no-store",
    },
  });
}

/** GET /health — воркер відповідає. Не звертається до БД і KV. */
export function handleHealth(): Response {
  return json({
    status: "ok",
    worker: "wwwuabot-api",
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /health/deep — перевірка залежностей.
 *
 * Повертає 503, якщо хоч одна залежність недоступна, щоб зовнішній монітор
 * міг відрізнити «воркер живий, але дані не працюють» від «все гаразд».
 *
 * Тексти помилок НЕ повертаються: ендпоїнт публічний, а повідомлення D1
 * бувають детальними (назви таблиць, колонок, SQL). Поруч, для себе, вони
 * пишуться в лог.
 */
export async function handleDeepHealth(env: Env): Promise<Response> {
  const checks: Record<string, boolean> = {};

  try {
    // Найдешевший запит, який доводить, що біндинг D1 живий.
    await env.DB.prepare("SELECT 1").first();
    checks.db = true;
  } catch {
    checks.db = false;
  }

  try {
    await env.CONTENT_KV.get("__healthcheck__");
    checks.kv = true;
  } catch {
    checks.kv = false;
  }

  const ok = Object.values(checks).every(Boolean);

  if (!ok) {
    apiLog.error("/health/deep degraded", JSON.stringify(checks));
  }

  return json(
    {
      status: ok ? "ok" : "degraded",
      worker: "wwwuabot-api",
      checks,
      timestamp: new Date().toISOString(),
    },
    ok ? 200 : 503,
  );
}
