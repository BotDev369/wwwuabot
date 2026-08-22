// 🔶 БЛОК: ВОРКЕР-ВХІД — /api/* проксує в API-воркер через service binding, решту віддає ASSETS.
export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  API: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return env.API.fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
