/**
 * Контролер моніторингу проєкту — читання зрізів і ручний збір.
 *
 * **Шляхи живуть під `/api/admin/`, і це не косметика:** адмін-гейт у
 * `router.ts` визначають саме префікси, тож ендпоїнт поза ними пройшов би
 * повз перевірку й став публічним мовчки (AGENTS.md §5, §7). Окремої
 * авторизації тут немає навмисно: сесія вже перевірена до цього файлу.
 *
 * **Токенів у відповідях немає ніколи.** Назовні йде лише «налаштовано / ні»:
 * сторінці цього досить, а помилка в розмітці не може злити секрет.
 *
 * @module api-dev/src/controllers/monitoring.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { collectSnapshot } from "../services/monitoring/collect";
import { readSummary } from "../services/monitoring/read";
import { saveSnapshot } from "../services/monitoring/store";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Зріз читається щоразу свіжим: кешована динаміка — це вже не динаміка.
      "Cache-Control": "no-store",
    },
  });
}

/**
 * `GET /api/admin/monitoring/summary` — усе, що потрібно сторінці.
 *
 * Один запит, а не три: останній зріз, попередній (для зміни показників) та
 * історія читаються разом, бо сторінка без жодного з них не має вигляду.
 */
export async function handleMonitoringSummary(_request: Request, env: Env): Promise<Response> {
  try {
    return json(await readSummary(env));
  } catch (error) {
    apiLog.error("monitoring: читання зрізів", error);
    return json({ error: "Не вдалось прочитати зрізи моніторингу" }, 500);
  }
}

/**
 * `POST /api/admin/monitoring/collect` — зібрати зріз зараз.
 *
 * Той самий шлях, що й у розкладу: різниця лише в `trigger`. Помилка окремих
 * колекторів не робить відповідь помилковою — зріз записано, а причина
 * видна в його ж звіті.
 */
export async function handleMonitoringCollect(_request: Request, env: Env): Promise<Response> {
  try {
    const outcome = await collectSnapshot(env, "manual");
    return json(await saveSnapshot(env, outcome, "manual"));
  } catch (error) {
    apiLog.error("monitoring: збір зрізу", error);
    return json({ error: "Не вдалось зібрати зріз" }, 500);
  }
}
