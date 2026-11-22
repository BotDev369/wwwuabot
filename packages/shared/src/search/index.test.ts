import { describe, expect, it } from "vitest";
import { searchTermsFrom } from "./index";

describe("searchTermsFrom", () => {
  it("бере назву, адресу й окремі слова без повторів", () => {
    const terms = searchTermsFrom("Астрагал", "astrahal");
    expect(terms[0]).toBe("Астрагал");
    expect(terms).toContain("astrahal");
    expect(terms.filter((term) => term === "Астрагал")).toHaveLength(1);
  });

  it("додає слова адреси й не дублює те саме в транслітерації", () => {
    const terms = searchTermsFrom("Мʼята перцева", "pershe");
    expect(terms).toContain("Мʼята перцева");
    expect(terms).toContain("pershe");
    expect(terms.some((term) => term.length < 3)).toBe(false);
    // «Мʼята» й «myata» — один ключ, тож друге місце в списку нічого не додає.
    expect(terms.filter((term) => term.toLowerCase().startsWith("м"))).toHaveLength(2);
  });

  it("не додає те саме слово в різному регістрі", () => {
    const terms = searchTermsFrom("Галяшоп", "галяшоп");
    expect(terms.filter((term) => term.toLowerCase() === "галяшоп")).toHaveLength(1);
  });

  it("порожні назва й адреса дають порожній список", () => {
    expect(searchTermsFrom("", "")).toEqual([]);
  });

  it("тримає не більше 24 слів", () => {
    const title = Array.from({ length: 40 }, (_, i) => `слово${i}`).join(" ");
    expect(searchTermsFrom(title, `slug-${"x".repeat(80)}`).length).toBeLessThanOrEqual(24);
  });
});
