/**
 * Сесія Telegram для прев'ю — **тільки режим розробки**.
 *
 * Поза Telegram `initData` порожній, і `web-platform-dev/src/app/AuthGate.tsx`
 * навмисно не малює нічого. Тут ми підписуємо **справжній** `initData` тим самим
 * алгоритмом, що й Telegram, тож `api-dev` перевіряє його своєю звичайною
 * перевіркою (`packages/shared/src/security/telegram.ts`) — ніяких винятків у
 * самій перевірці не з'являється.
 *
 * Токен читає сервер розробки, у бандл він не потрапляє: плагін стоїть із
 * `apply: "serve"`, у продакшн-збірці його немає. У браузер їде лише підписаний
 * рядок — саме те, що Telegram віддає клієнту Mini App.
 *
 * **Два акаунти — одна адреса.** `PREVIEW_TELEGRAM_ID` приймає список (комами),
 * перший id — типовий, решта доступні через `?as=<id>` у адресі сторінки: так
 * один прогін перевіряє і власника, і звичайну людину. Будь-який id **поза
 * списком** не підписується взагалі — прев'ю не вміє видавати чуже ім'я.
 *
 * @module web-platform-dev/dev/telegram-session
 */

import { createHmac } from "node:crypto";
import type { Plugin } from "vite";

/** Токен **дев**-бота: те саме значення, що в секреті `BOT_TOKEN` в `api-dev`. */
export const PREVIEW_TOKEN_VAR = "BOT_TOKEN_DEV";

/** Telegram-id (або список через кому: перший — типовий, решта — для `?as=`). */
export const PREVIEW_USER_VAR = "PREVIEW_TELEGRAM_ID";

/** Адреса, за якою сервер розробки віддає підписану сесію. */
export const PREVIEW_SESSION_PATH = "/__telegram-preview-session.js";

/** Що дозволено підписувати: токен і список id (перший — типовий). */
export interface PreviewSession {
  token: string;
  ids: number[];
}

/**
 * Сесія з оточення — або імена змінних, яких не хватає.
 *
 * `missing` називає **саме відсутні**: коли людина додала один ключ із двох,
 * попередження мусить показати другий, а не обидва.
 */
export function readPreviewSession(env: NodeJS.ProcessEnv): {
  session?: PreviewSession;
  missing: string[];
} {
  const token = env[PREVIEW_TOKEN_VAR]?.trim() ?? "";
  const ids = (env[PREVIEW_USER_VAR] ?? "")
    .split(/[,\s]+/)
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  const missing: string[] = [];
  if (!token) missing.push(PREVIEW_TOKEN_VAR);
  if (!ids.length) missing.push(PREVIEW_USER_VAR);
  return missing.length ? { missing } : { session: { token, ids }, missing };
}

/** Кого підписуємо для цього запиту: id з `?as=` або типовий. `null` — не дозволено. */
export function pickPreviewUserId(
  session: PreviewSession,
  requested?: string | null,
): number | null {
  if (!requested) return session.ids[0];
  const id = Number(requested);
  return session.ids.includes(id) ? id : null;
}

/**
 * Підпис `initData`: `HMAC_SHA256(HMAC_SHA256("WebAppData", token), checkString)`
 * — той самий порядок ключів, що й у Telegram. `auth_date` свіжий щоразу, бо
 * `api-dev` відкидає підпис, старший за добу.
 */
export function signInitData(
  identity: { token: string; userId: number },
  now = Date.now(),
): string {
  const params: Record<string, string> = {
    query_id: `AAA${identity.userId}`,
    user: JSON.stringify({ id: identity.userId, first_name: "Preview", language_code: "uk" }),
    chat_type: "private",
    auth_date: String(Math.floor(now / 1000)),
  };

  const checkString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(identity.token).digest();
  const hash = createHmac("sha256", secret).update(checkString).digest("hex");

  return new URLSearchParams({ ...params, hash }).toString();
}

/**
 * Замінює `Telegram.WebApp` обгорткою з нашими `initData`/`initDataUnsafe`.
 *
 * Заміною, а не присвоєнням: SDK оголошує обидва поля гетерами без сетера, тож
 * записати в них неможливо. SDK лишається прототипом обгортки — його методи
 * (`ready`, тема, висота) працюють як і в Telegram.
 */
export function sessionShim(initData: string): string {
  return `(function () {
  var data = ${JSON.stringify(initData)};
  var params = new URLSearchParams(data);
  var app = Object.create((window.Telegram && window.Telegram.WebApp) || null);
  Object.defineProperties(app, {
    initData: { value: data, enumerable: true },
    initDataUnsafe: {
      enumerable: true,
      value: {
        user: JSON.parse(params.get("user")),
        auth_date: Number(params.get("auth_date")),
        hash: params.get("hash")
      }
    }
  });
  window.Telegram = window.Telegram || {};
  window.Telegram.WebApp = app;
})();`;
}

/**
 * `?as=` з адреси.
 *
 * Беремо його з **адреси запиту скрипта** (і з `Referer`, тобто з адреси самої
 * сторінки): `transformIndexHtml` у режимі розробки віддає ту саму розмітку з
 * кешу, тож покласти вибір акаунта в розмітку не можна — id має обиратись на
 * кожен запит. Прямий `?as=` лишається для curl і тестів.
 */
function requestedId(value: string | undefined): string | null {
  if (!value) return null;
  return new URL(value, "http://preview").searchParams.get("as");
}

/**
 * Плагін прев'ю. Ставить у `index.html` єдиний тег — адресу сесії з вибраним
 * id; якщо змінних немає, розмітку не чіпає й каже про це в консоль сервера,
 * щоб порожнє прев'ю мало названу причину, а не виглядало як поломка.
 */
export function telegramPreviewSession(env: NodeJS.ProcessEnv = process.env): Plugin {
  return {
    name: "telegram-preview-session",
    apply: "serve",
    configureServer(server) {
      const { session, missing } = readPreviewSession(env);
      if (!session) {
        server.config.logger.warn(
          `[telegram-preview] не задано ${missing.join(" і ")} — прев'ю буде порожнім ` +
            `(див. web-platform-dev/README.md).`,
        );
        return;
      }

      server.config.logger.info(
        `[telegram-preview] сесія для Telegram-id ${session.ids[0]}` +
          (session.ids.length > 1
            ? `; ?as=<id> перемикає на ${session.ids.slice(1).join(", ")}`
            : ""),
      );
      server.middlewares.use(PREVIEW_SESSION_PATH, (request, response) => {
        const page = requestedId(request.headers.referer);
        const userId = pickPreviewUserId(session, page ?? requestedId(request.url));
        response.setHeader("Content-Type", "text/javascript; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        if (userId === null) {
          // Порожній підпис — це не помилка клієнта: прев'ю просто не видає
          // ідентичність, якої йому не дозволили.
          response.statusCode = 403;
          response.end("/* preview: цей Telegram-id не в списку дозволених */");
          return;
        }
        response.end(sessionShim(signInitData({ token: session.token, userId })));
      });
    },
    transformIndexHtml() {
      if (!readPreviewSession(env).session) return [];
      return [{ tag: "script", attrs: { src: PREVIEW_SESSION_PATH }, injectTo: "head" }];
    },
  };
}
