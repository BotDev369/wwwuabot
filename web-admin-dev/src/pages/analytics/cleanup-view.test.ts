import { describe, expect, it } from "vitest";
import { buildCleanupRequest, cleanupTargetLabel, initialCleanupForm } from "./cleanup-view";

const RANGE = { from: "2026-10-23T09:00:00.000Z", to: "2026-10-24T09:00:00.000Z" };

describe("прибирання журналу", () => {
  it("типово бере діапазон екрана, а не весь час", () => {
    const form = initialCleanupForm(RANGE);
    expect(form.period).toBe("range");
    const built = buildCleanupRequest(form);
    expect("request" in built && built.request.all).not.toBe(true);
    expect("request" in built && built.request.from).toBe(new Date(RANGE.from).toISOString());
  });

  it("порожні ознаки — це явне `all`, а не забутий фільтр", () => {
    const built = buildCleanupRequest({ ...initialCleanupForm(RANGE), period: "all" });
    expect("request" in built && built.request).toEqual({ all: true });
  });

  it("звужує до людини, поверхні й виду події", () => {
    const built = buildCleanupRequest({
      ...initialCleanupForm(RANGE),
      period: "all",
      scope: "user",
      userId: "372567448",
      surface: "platform",
      kind: "view",
    });

    expect("request" in built && built.request).toEqual({
      userId: 372567448,
      surface: "platform",
      kind: "view",
    });
  });

  it("кривий номер і порожній період — помилка, а не «тоді все»", () => {
    expect(
      buildCleanupRequest({ ...initialCleanupForm(RANGE), scope: "user", userId: "abc" }),
    ).toEqual({ error: "Вкажіть номер користувача" });

    expect(
      buildCleanupRequest({
        ...initialCleanupForm(RANGE),
        period: "range",
        fromInput: "",
        toInput: "",
      }),
    ).toEqual({ error: "Вкажіть початок або кінець періоду" });
  });

  it("описує словами те, що зникне", () => {
    expect(cleanupTargetLabel({ all: true })).toBe("усі події журналу");
    expect(
      cleanupTargetLabel({ userId: 7, from: RANGE.from, to: RANGE.to, surface: "bot" }),
    ).toContain("користувач #7");
    expect(cleanupTargetLabel({ from: RANGE.from, to: RANGE.to })).toContain("період");
    expect(cleanupTargetLabel({ kind: "view" })).toContain("Екран");
  });
});
