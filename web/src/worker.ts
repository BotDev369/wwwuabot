// 🔶 БЛОК: ВОРКЕР-ВХІД — віддає зібраний React-додаток через ASSETS binding.
export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request);
  }
};
