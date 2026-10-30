/**
 * Посилання блоку: внутрішній шлях веде роутер, зовнішній — браузер.
 *
 * @module packages/ui/src/blocks/link-nav.test
 */

import { describe, expect, it, vi } from "vitest";
import { appLinkHandler, isAppPath } from "./link-nav";

describe("isAppPath", () => {
  it("приймає рівно один провідний слеш", () => {
    expect(isAppPath("/viruvannia")).toBe(true);
    expect(isAppPath("//example.com/x")).toBe(false);
    expect(isAppPath("https://example.com")).toBe(false);
    expect(isAppPath("#blok")).toBe(false);
  });
});

describe("appLinkHandler", () => {
  it("без роутера подію не чіпає", () => {
    expect(appLinkHandler("/viruvannia", undefined)).toBeUndefined();
  });

  it("чужу адресу лишає браузеру", () => {
    expect(appLinkHandler("https://example.com", vi.fn())).toBeUndefined();
  });

  it("внутрішній шлях віддає роутеру", () => {
    const navigate = vi.fn();
    const preventDefault = vi.fn();

    appLinkHandler("/viruvannia-a1", navigate)?.({ preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/viruvannia-a1");
  });
});
