import { describe, expect, it } from "vitest";
import { screenKeyOfPath } from "./screens";

describe("ключ екрана з адреси", () => {
  it("називає екрани тим самим ключем, що й журнал", () => {
    expect(screenKeyOfPath("/trackers")).toBe("trackers");
    expect(screenKeyOfPath("/favorites")).toBe("favorites");
    expect(screenKeyOfPath("/messages")).toBe("messages");
    expect(screenKeyOfPath("/account")).toBe("account");
    expect(screenKeyOfPath("/games/quiz")).toBe("games");
  });

  it("вкладки магазину — свій ключ, а не сторінка контенту", () => {
    // Товари й замовлення живуть під номером сценарію — це той самий екран.
    expect(screenKeyOfPath("/scenarios/7/products")).toBe("scenarios");
    expect(screenKeyOfPath("/scenarios/7/orders")).toBe("scenarios");
  });

  it("сторінка контенту за slug — окремий ключ, а не чужий екран", () => {
    expect(screenKeyOfPath("/dateanalysis")).toBe("date-analysis");
    expect(screenKeyOfPath("/some-scenario")).toBe("page");
    expect(screenKeyOfPath("/")).toBe("account");
    expect(screenKeyOfPath("/trackers/")).toBe("trackers");
  });
});
