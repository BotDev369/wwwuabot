/**
 * web-platform Worker — оболонка TWA.
 *
 * `/api/*` проксує в `api-dev` через service binding, решту віддає ASSETS.
 * Уся бізнес-логіка — в api-dev; тут лише транспорт і заголовки асетів.
 */
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
function fixAssetHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return env.API.fetch(request);
    }
    return fixAssetHeaders(await env.ASSETS.fetch(request));
  },
};
