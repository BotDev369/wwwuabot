/**
 * Сесія прев'ю: **підпис мусить проходити звичайну перевірку** з тим самим
 * токеном і не проходити з іншим — інакше прев'ю було б винятком у безпеці.
 *
 * @module packages/shared/src/security/preview-session.test
 */

import { describe, expect, it } from "vitest";
import { previewSessionShim, signPreviewInitData } from "./preview-session";
import { verifyInitDataPayload } from "./telegram";

const TOKEN = "123456:TEST-BOT-TOKEN";

describe("сесія прев'ю", () => {
  it("підписує initData, який проходить звичайну перевірку", async () => {
    const initData = await signPreviewInitData(TOKEN, 42);
    const payload = await verifyInitDataPayload(initData, TOKEN);

    expect(payload?.userId).toBe(42);
    expect(payload?.user.first_name).toBe("Preview");
  });

  it("⛔ з іншим токеном підпис не проходить", async () => {
    const initData = await signPreviewInitData(TOKEN, 42);

    expect(await verifyInitDataPayload(initData, "1:ІНШИЙ")).toBeNull();
  });

  it("обгортка ставить initData і не губить методи SDK", () => {
    const shim = previewSessionShim("user=%7B%22id%22%3A42%7D&hash=abc");

    expect(shim).toContain("window.Telegram.WebApp = app");
    expect(shim).toContain("initData: { value: data");
    // Прототип береться від SDK: інакше `ready()` і тема зникають.
    expect(shim).toContain("Object.create((window.Telegram && window.Telegram.WebApp)");
  });
});
