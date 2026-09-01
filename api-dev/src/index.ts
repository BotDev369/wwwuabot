import { handleRequest } from "./router";
import type { Env } from "./shared/types";

/**
 * API Worker — unified REST gateway for wwwuabot.
 *
 * All external endpoints live here (see AGENTS.md §3.2).
 * Individual controllers handle business logic; this file is
 * the single entry point that Cloudflare Workers calls.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};

// 🤖 Qwen AI Agent Test: Direct push to main verified on 01.09.2026
