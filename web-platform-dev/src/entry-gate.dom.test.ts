/**
 * Гейт першого кадру в `index.html`: Mini App — показуємо, веб — блок.
 *
 * @module web-platform-dev/src/entry-gate.dom.test
 */

import { describe, expect, it } from "vitest";
import { WEB_BLOCK_ATTR } from "@wwwuabot/shared/security/mini-app";
import { entryGateScript } from "@wwwuabot/shared/security/entry-gate";

// Скрипт спільний для обох оболонок; платформа вмикає лише ключ прев'ю.
const SCRIPT = entryGateScript({ preview: true });
const PUBLIC_HOST = "web-platform-dev.diskomate.workers.dev";

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

describe("гейт входу платформи", () => {
  it("у Mini App продукт показуємо", () => {
    expect(blocked({ initData: "user=%7B%7D&hash=abc" })).toBe(false);
  });

  it("у публічному браузері без підпису — блок із першого кадру", () => {
    expect(blocked({ initData: "" })).toBe(true);
  });

  it("ключ прев'ю з адреси знімає блок", () => {
    expect(blocked({ search: "?preview=ключ" })).toBe(false);
  });

  it("ключ прев'ю зі сховища вкладки теж знімає блок", () => {
    expect(blocked({ storage: { "preview-session-key": "ключ" } })).toBe(false);
  });

  it("локальна розробка не блокується", () => {
    expect(blocked({ hostname: "localhost" })).toBe(false);
  });
});
