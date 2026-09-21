/**
 * Сторожі правил оголошення.
 *
 * Тут ламається мовчки те, що потім видно на дошці: невідомий вид, порожнє
 * оголошення, рядок без межі. Тому перевіряється не «чи працює обрізання», а
 * межа: що **не** стане оголошенням і що саме стане.
 *
 * @module @wwwuabot/shared/ads
 */

import { describe, expect, it } from "vitest";
import {
  AD_BODY_MAX,
  AD_KINDS,
  AD_KIND_LABELS,
  AD_TITLE_MAX,
  DEFAULT_AD_KIND,
  adKindLabel,
  isAdKind,
  sanitizeLine,
  validateAd,
} from "./rules";

describe("види оголошень", () => {
  it("у кожного виду є підпис, і підписи не повторюються", () => {
    const labels = AD_KINDS.map((kind) => AD_KIND_LABELS[kind]);
    expect(labels.every((label) => label.trim().length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("типовий вид існує в списку", () => {
    expect(AD_KINDS).toContain(DEFAULT_AD_KIND);
  });

  it("невідомий вид не ламає показ — він показується як є", () => {
    expect(adKindLabel("sell")).toBe("Продам");
    expect(adKindLabel("zdam")).toBe("zdam");
    expect(isAdKind("zdam")).toBe(false);
  });
});

describe("перевірка оголошення", () => {
  it("нормальне оголошення проходить і чиститься", () => {
    const result = validateAd({
      kind: "sell",
      title: "  Продам   велосипед  ",
      body: "Стан добрий",
      price: "2 000 ₴",
      place: "Київ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe("Продам велосипед");
    expect(result.value.price).toBe("2 000 ₴");
    expect(result.value.isActive).toBe(true);
  });

  it("⛔ невідомий вид не записується — навіть якщо він із бази", () => {
    const result = validateAd({ kind: "zdam", title: "Щось" });
    expect(result.ok).toBe(false);
  });

  it("⛔ порожнє оголошення не записується", () => {
    expect(validateAd({ kind: "sell", title: "   ", body: "\n" }).ok).toBe(false);
    // Досить одного з двох: заголовок без тексту — це теж оголошення.
    expect(validateAd({ kind: "gift", title: "Віддам кота" }).ok).toBe(true);
    expect(validateAd({ kind: "gift", body: "Віддам кота" }).ok).toBe(true);
  });

  it("довжини притискаються, а не відхиляються", () => {
    const result = validateAd({
      kind: "sell",
      title: "я".repeat(AD_TITLE_MAX + 50),
      body: "б".repeat(AD_BODY_MAX + 50),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toHaveLength(AD_TITLE_MAX);
    expect(result.value.body).toHaveLength(AD_BODY_MAX);
  });

  it("чернетка лишається чернеткою: `active: false` не губиться", () => {
    const result = validateAd({ kind: "sell", title: "Риба", isActive: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isActive).toBe(false);
  });

  it("сміття замість рядка дає порожнечу, а не «[object Object]»", () => {
    expect(sanitizeLine({ a: 1 }, 10)).toBe("");
    expect(sanitizeLine(42, 10)).toBe("");
    expect(sanitizeLine("  два   слова  ", 10)).toBe("два слова");
    expect(sanitizeLine("я".repeat(20), 5)).toHaveLength(5);
  });
});
