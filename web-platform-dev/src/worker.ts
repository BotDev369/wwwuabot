/**
 * web-platform Worker — оболонка TWA.
 *
 * `/api/*` проксує в `api-dev` через service binding, решту віддає ASSETS.
 * Уся бізнес-логіка — в api-dev; тут лише транспорт і заголовки асетів.
 */
import { secureResponse } from "@wwwuabot/shared/security/headers";

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  API: { fetch: (request: Request) => Promise<Response> };
}

/**
 * Заголовки асетів.
 *
 * **Чому `no-store` для всього, а не лише для HTML.** Telegram WebView
 * тримає старий JS-бандл у своєму кеші довше, ніж хотілося б: після деплою
 * людина бачить попередню версію — а в нас це означало «гейт допуску не
 * спрацював», хоча насправді працювала **стара** версія без гейта. Тому
 * асети не кешуються ніде; це платформа, яку часто перезапускають, а не
 * бібліотека з далеко розставлених версій.
 */
function fixAssetHeaders(res: Response, url: string): Response {
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return secureResponse(
    new Response(res.body, { status: res.status, statusText: res.statusText, headers }),
    {
      url,
      csp: true,
    },
  );
}

/**
 * Перехід по документу: `GET`, без розширення файла, браузер чекає HTML.
 * Асети й виклики `/api/` редирект не питають — інакше кожен файл збірки
 * робив би зайвий похід у мережу.
 */
function isDocumentRequest(request: Request, url: URL): boolean {
  if (request.method !== "GET") return false;
  if (url.pathname === "/") return false;
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return false;
  return (request.headers.get("Accept") ?? "").includes("text/html");
}

/**
 * 301, якщо ця адреса — стара адреса існуючої сторінки (`slug_aliases`).
 *
 * Бази в цього воркера немає, тож адресу питає `api-dev` через service
 * binding. Невдача (мережа, 500, дивна відповідь) не ламає сторінку: тоді
 * віддаємо застосунок, як раніше.
 */
async function pageRedirect(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!isDocumentRequest(request, url)) return null;

  const probe = new URL("/api/public/redirect", url.origin);
  probe.searchParams.set("path", url.pathname);

  try {
    const response = await env.API.fetch(
      new Request(probe, { headers: { Accept: "application/json" } }),
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { to?: unknown };
    if (typeof body.to !== "string" || body.to === url.pathname) return null;
    return Response.redirect(`${url.origin}${body.to}${url.search}`, 301);
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Проксі теж отримує заголовки: JSON безпеки не потребує, але
    // `X-Content-Type-Options` має бути й на ньому.
    if (url.pathname.startsWith("/api/")) {
      return secureResponse(await env.API.fetch(request), { url: url.toString() });
    }

    // Адреса — контракт: переїзд сторінки лишає за собою 301, а не 404
    // (`docs/URL.md`). Перевірка коштує один виклик у `api-dev` і лише на
    // переходах по документу.
    const redirect = await pageRedirect(request, env, url);
    if (redirect) return redirect;

    return fixAssetHeaders(await env.ASSETS.fetch(request), url.toString());
  },
};
