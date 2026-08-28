// 🔶 БЛОК: ВОРКЕР-ВХІД — /api/* проксує в API-воркер через service binding, решту віддає ASSETS.
export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  API: { fetch: (request: Request) => Promise<Response> };
}

/** Ensure asset responses work correctly in all browsers. */
function fixAssetHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  const ct = headers.get("content-type") || "";
  if (ct.includes("text/html")) {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }
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
