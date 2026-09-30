/**
 * Контролер самооцінки («Розвиток»): історія результатів і прийом проходження.
 *
 * **Ідентичність — тільки з підписаного `initData`.** Жоден заголовок, cookie
 * чи параметр не називає власника (`AGENTS.md` §7): інший спосіб назвати людину
 * можна підробити, а це — ні.
 *
 * **Результат не приймається від клієнта.** `POST` приймає лише номери обраних
 * варіантів, а бал рахує сервер. Тому людина не підробить собі «нормальний»
 * результат, і правило рахування живе в одному місці навіть тоді, коли
 * клієнт трохи інший.
 *
 * @module api-dev/src/controllers/assessments.controller
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { ASSESSMENTS } from "@wwwuabot/shared/assessments";
import { listAssessments, saveAssessment } from "../services/assessments.service";
import { peerTallies } from "../services/assessments-peers.service";
import { resolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";
import type { Env } from "../shared/types";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * `GET` / `POST /api/user/assessments` — результати самооцінки людини.
 *
 * `GET` віддає реєстр тестів разом з історією: екран має показати «Розвиток»
 * одним екраном, а не обіцянкою, яку треба довантажувати другим запитом.
 * `?test=who5` звужує історію одним тестом.
 *
 * **Разом з `results` йде `peers`** — скільки людей у кожній смузі кожного
 * тесту. Окремим запитом це означало б, що картка результату спершу малюється
 * без розподілу, а потім під ним додається ще один блок.
 */
export async function handleAssessments(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const ownerId = String(identity.userId);

  try {
    await ensureTables(env.DB, ["assessment_results"]);

    const url = new URL(request.url);

    if (request.method === "GET") {
      const test = url.searchParams.get("test") ?? undefined;
      return json({
        ok: true,
        tests: ASSESSMENTS,
        results: await listAssessments(env.DB, ownerId, test),
        peers: await peerTallies(env.DB),
      });
    }

    if (request.method === "POST") {
      let body: { test?: unknown; answers?: unknown };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
      }

      const testKey = typeof body.test === "string" ? body.test : "";
      if (testKey === "") return json({ ok: false, error: "Не вказано тест" }, 400);

      const outcome = await saveAssessment(env.DB, ownerId, testKey, body.answers);
      if (!outcome.ok) return json({ ok: false, error: outcome.error }, 400);
      // **Рахунок перераховується після запису, а не береться з памʼяті.**
      // Іначше картка під щойно збереженим результатом показує «ти тут один»
      // у ту ж мить, коли людина щойно увійшла в статистику.
      //
      // Повертаються **усі** рядки проходження — по одному на шкалу: тест із
      // двома шкалами це два бали, і кліент малює обидва.
      return json({ ok: true, records: outcome.records, peers: await peerTallies(env.DB) });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    apiLog.error("Assessments error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}
