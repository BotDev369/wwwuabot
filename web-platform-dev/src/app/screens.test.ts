import { describe, expect, it } from "vitest";
import { screenKeyOfPath } from "./screens";

describe("ключ екрана з адреси", () => {
  it("називає екрани тим самим ключем, що й журнал", () => {
    expect(screenKeyOfPath("/trackers")).toBe("trackers");
    expect(screenKeyOfPath("/trackers/7")).toBe("tracker");
    expect(screenKeyOfPath("/favorites")).toBe("favorites");
    expect(screenKeyOfPath("/messages")).toBe("messages");
    expect(screenKeyOfPath("/account")).toBe("account");
    expect(screenKeyOfPath("/games/quiz")).toBe("games");
  });

  it("не плутає сторінки людини з екраном сторінок", () => {
    expect(screenKeyOfPath("/pages")).toBe("pages");
    // Товари й замовлення живуть під сторінкою — це той самий екран.
    expect(screenKeyOfPath("/pages/7/products")).toBe("pages");
  });

  it("сторінка контенту за slug — окремий ключ, а не чужий екран", () => {
    expect(screenKeyOfPath("/dateanalysis")).toBe("date-analysis");
    expect(screenKeyOfPath("/some-scenario")).toBe("page");
    expect(screenKeyOfPath("/")).toBe("account");
    expect(screenKeyOfPath("/trackers/")).toBe("trackers");
  });
});
