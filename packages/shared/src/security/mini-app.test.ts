/**
 * Вибір «Mini App чи веб»: одна функція на обидві оболонки.
 *
 * @module packages/shared/src/security/mini-app.test
 */

import { describe, expect, it } from "vitest";
import {
  blocksWebEntry,
  isLocalDevHost,
  isTelegramMiniApp,
  isWebEntryBlocked,
  WEB_BLOCK_ATTR,
} from "./mini-app";

const PUBLIC = "web-platform-dev.diskomate.workers.dev";

describe("isTelegramMiniApp", () => {
  it("порожній або відсутній initData — не Mini App", () => {
    expect(isTelegramMiniApp("")).toBe(false);
    expect(isTelegramMiniApp(undefined)).toBe(false);
    expect(isTelegramMiniApp(null)).toBe(false);
  });

  it("непорожній підпис — Mini App", () => {
    expect(isTelegramMiniApp("user=%7B%7D&hash=abc")).toBe(true);
  });
});

describe("isLocalDevHost", () => {
  it("петля — локальна розробка", () => {
    expect(isLocalDevHost("localhost")).toBe(true);
    expect(isLocalDevHost("127.0.0.1")).toBe(true);
    expect(isLocalDevHost("[::1]")).toBe(true);
  });

  it("публічний хост — не локальна розробка", () => {
    expect(isLocalDevHost(PUBLIC)).toBe(false);
  });
});

describe("blocksWebEntry", () => {
  it("Mini App не блокуємо", () => {
    expect(blocksWebEntry({ initData: "hash=abc", hostname: PUBLIC })).toBe(false);
  });

  it("публічний веб без підпису — блокуємо", () => {
    expect(blocksWebEntry({ initData: "", hostname: PUBLIC })).toBe(true);
    expect(blocksWebEntry({ hostname: PUBLIC })).toBe(true);
  });

  it("ключ прев'ю знімає блок — це дев-інструмент власника", () => {
    expect(blocksWebEntry({ hostname: PUBLIC, preview: true })).toBe(false);
  });

  it("локальна розробка не блокується", () => {
    expect(blocksWebEntry({ hostname: "localhost" })).toBe(false);
  });
});

describe("isWebEntryBlocked", () => {
  it("читає атрибут, який ставить гейт першого кадру", () => {
    expect(isWebEntryBlocked({ hasAttribute: (name) => name === WEB_BLOCK_ATTR })).toBe(true);
    expect(isWebEntryBlocked({ hasAttribute: () => false })).toBe(false);
  });
});
