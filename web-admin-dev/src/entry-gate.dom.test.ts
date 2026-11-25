/**
 * Гейт першого кадру в `index.html` адмінки: Mini App — показуємо, веб — блок.
 *
 * @module web-admin-dev/src/entry-gate.dom.test
 */

import { describe, expect, it } from "vitest";
import { WEB_BLOCK_ATTR } from "@wwwuabot/shared/security/mini-app";
import { entryGateScript } from "@wwwuabot/shared/security/entry-gate";

// Скрипт спільний для обох оболонок; адмінка ключа прев'ю не має.
const SCRIPT = entryGateScript();
const PUBLIC_HOST = "web-admin-dev.diskomate.workers.dev";

function blocked(options: {
  hostname?: string;
  search?: string;
  initData?: string;
  storage?: Record<string, string>;
}): boolean {
  const attrs = new Set<string>();
  const document = { documentElement: { setAttribute: (name: string) => attrs.add(name) } };
  const window = {
    Telegram: options.initData ? { WebApp: { initData: options.initData } } : undefined,
  };
  const location = { hostname: options.hostname ?? PUBLIC_HOST, search: options.search ?? "" };
  const sessionStorage = {
    getItem: (key: string) => options.storage?.[key] ?? null,
  };
  new Function("window", "location", "sessionStorage", "document", SCRIPT)(
    window,
    location,
    sessionStorage,
    document,
  );
  return attrs.has(WEB_BLOCK_ATTR);
}

describe("гейт входу адмінки", () => {
  it("у Mini App панель показуємо", () => {
    expect(blocked({ initData: "user=%7B%7D&hash=abc" })).toBe(false);
  });

  it("у публічному браузері — блок із першого кадру", () => {
    expect(blocked({ initData: "" })).toBe(true);
  });

  it("ключ прев'ю панель не відкриває: в адмінки його немає", () => {
    expect(blocked({ search: "?preview=ключ" })).toBe(true);
  });

  it("локальна розробка не блокується", () => {
    expect(blocked({ hostname: "127.0.0.1" })).toBe(false);
  });
});
