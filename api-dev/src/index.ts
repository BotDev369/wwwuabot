import * as Sentry from "@sentry/cloudflare";
import { sentryOptions } from "@wwwuabot/shared/observability/sentry";
import { handleRequest } from "./router";
import { apiLog } from "./shared/logger";
import { markEntryFromRequest } from "./shared/platform-entry";
import { recordPlatformAction } from "./services/user-events.service";
import { secureResponse } from "@wwwuabot/shared/security/headers";
import { collectSnapshot } from "./services/monitoring/collect";
import { saveSnapshot } from "./services/monitoring/store";
import { runSpendingCollection } from "./services/spending/collect";
import { SPENDING_CRON, previousMonthPeriod } from "./services/spending/config";
import type { Env } from "./shared/types";

/**
 * Збір зрізу моніторингу за розкладом (`[triggers]` у `wrangler.toml`).
 *
 * Шлях той самий, що й у кнопки в панелі, — збирає й пише та сама пара
 * функцій. Падіння тут не має валити воркера: воно лишає слід у логах і
 * Sentry, а кожен наступний запуск спробує знову. Через `waitUntil`
 * платформа дочекається запису, а не обірве його разом із викликом.
 */
async function runScheduledCollection(env: Env): Promise<void> {
  try {
    await saveSnapshot(env, await collectSnapshot(env, "cron"), "cron");
  } catch (error) {
    apiLog.error("monitoring: збір за розкладом упав", error);
    Sentry.captureException(error);
  }
}

/**
 * Збір Є-data за минулий місяць.
 *
 * Падіння не має валити воркера: причина лишається в логах і Sentry, а
 * курсор у `spending_sync` дозволяє наступному запуску продовжити з того
 * кроку, на якому обірвалося (docs/SPENDING.md §4).
 */
async function runSpendingJob(env: Env): Promise<void> {
  try {
    await runSpendingCollection(env, { period: previousMonthPeriod(new Date()) });
  } catch (error) {
    apiLog.error("spending: збір за розкладом упав", error);
    Sentry.captureException(error);
  }
}

/**
 * API Worker — unified REST gateway for wwwuabot.
 *
 * All external endpoints live here (see AGENTS.md §3, «єдиний API-шлюз»).
 * Individual controllers handle business logic; this file is
 * the single entry point that Cloudflare Workers calls.
 *
 * `Sentry.withSentry` тут рівно один раз і робить дві речі: ловить
 * необроблені винятки з будь-якого контролера та вирішує, чи взагалі
 * вмикатись. Без секрету `SENTRY_DSN` опції дорівнюють `undefined` — SDK
 * мовчки не робить нічого, тому деплой без секрету безпечний.
 * Деталі й політику даних див. `@wwwuabot/shared/observability/sentry`.
 *
 * Заразом тут фіксується **вхід на платформу** (`markEntryFromRequest`):
 * перший запит людини з підписаним `initData` — це і є її прихід у Mini App,
 * і ставить його саме воркер, а не контролер теми. Робиться у `waitUntil`,
 * тож відповіді не затримує.
 */
export default Sentry.withSentry(
  // `satisfies` ловить розходження між нашим обʼєктом (shared навмисно
  // вільний від залежностей) і реальним типом опцій SDK.
  (env: Env) => sentryOptions(env) satisfies Sentry.CloudflareOptions | undefined,
  {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      // Час дії береться тут, до обробки: журнал пишеться після відповіді, і
      // інакше порядок історії задавав би той, хто швидше записав рядок.
      const eventAt = Date.now();

      // Не `await`: відмітка часу не входить у відповідь, але мусить пережити
      // її відправку — інакше Cloudflare завершив би обіцянку разом із запитом.
      ctx.waitUntil(markEntryFromRequest(request, env));

      try {
        // Заголовки накладаються на виході воркера, а не в кожному
        // контролері: одна точка, яку не можна забути на новому шляху.
        const response = secureResponse(await handleRequest(request, env), { url: request.url });

        // Журнал дій — теж у `waitUntil`: подія вже сталася, і чекати запису
        // в базі перед відповіддю означало б платити за спостереження. `GET`
        // сюди не пише: читання — це система, а не дія людини.
        ctx.waitUntil(recordPlatformAction(request, env, response.status, eventAt));

        return response;
      } catch (error) {
        // Назовні — жодних деталей: у повідомленні D1 бувають назви таблиць
        // і значення, а клієнт цей ендпоїнт не захищений. Деталі йдуть у
        // Workers Logs (`apiLog`) і в Sentry — там вони й потрібні.
        apiLog.error("unhandled request error", error);
        Sentry.captureException(error);
        return secureResponse(
          new Response(JSON.stringify({ error: "Internal error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
          { url: request.url },
        );
      }
    },

    /** Розклад із `[triggers]`: `controller.cron` каже, який саме спрацював. */
    async scheduled(
      controller: ScheduledController,
      env: Env,
      ctx: ExecutionContext,
    ): Promise<void> {
      if (controller.cron === SPENDING_CRON) {
        ctx.waitUntil(runSpendingJob(env));
        return;
      }
      ctx.waitUntil(runScheduledCollection(env));
    },
  },
);
