/**
 * Види головного віджета: розпізнавання й початковий стан.
 *
 * @module bot-dev/src/shared/config/app-views.test
 */

import { describe, expect, it } from "vitest";
import { APP_LOOKUP, appChatData, isAppView } from "./app-views";

describe("app-views", () => {
  it("впізнає види й не плутає їх з іншими ключами", () => {
    expect(isAppView("start")).toBe(true);
    expect(isAppView("about")).toBe(true);
    expect(isAppView("contacts")).toBe(true);
    expect(isAppView("/start")).toBe(false);
    expect(isAppView("")).toBe(false);
  });

  it("стан віджета — це вид у JSON", () => {
    expect(APP_LOOKUP).toBe("/start");
    expect(appChatData("about")).toBe('{"v":"about"}');
  });
});
