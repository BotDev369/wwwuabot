/**
 * Підстановка адреси платформи у HTML віджета.
 *
 * @module bot-dev/src/shared/utils/widget-html.test
 */

import { describe, expect, it } from "vitest";
import { applyPlatformUrl } from "./widget-html";

describe("applyPlatformUrl", () => {
  it("міняє всі маркери на адресу без хвостового слеша", () => {
    expect(applyPlatformUrl("a __PLATFORM__ b __PLATFORM__", "https://example.dev/")).toBe(
      "a https://example.dev b https://example.dev",
    );
  });

  it("без адреси маркер зникає", () => {
    expect(applyPlatformUrl("<i>__PLATFORM__</i>")).toBe("<i></i>");
    expect(applyPlatformUrl("<i>__PLATFORM__</i>", null)).toBe("<i></i>");
  });
});
