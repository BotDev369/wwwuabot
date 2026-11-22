import { describe, expect, it } from "vitest";
import { ANALYSIS_TITLE, analysisAncestors } from "./analysis-chrome";

describe("шлях аналізу", () => {
  it("головна не має батьків — вона сама перший рівень фічі", () => {
    expect(analysisAncestors("/analysis")).toEqual([]);
  });

  it("підсторінка отримує розділ, а не втрачає його", () => {
    expect(analysisAncestors("/analysis/compare")).toEqual([ANALYSIS_TITLE]);
    expect(analysisAncestors("/analysis/qualities")).toEqual([ANALYSIS_TITLE]);
  });

  it("крок під підсторінкою зберігає обидва рівні", () => {
    expect(analysisAncestors("/analysis/compare/systems")).toEqual([ANALYSIS_TITLE, "Співставити"]);
    expect(analysisAncestors("/analysis/person/result")).toEqual([
      ANALYSIS_TITLE,
      "Аналізувати за датою",
    ]);
    expect(analysisAncestors("/analysis/tests/big-five")).toEqual([
      ANALYSIS_TITLE,
      "Пройти тестування",
    ]);
  });

  it("чужий розділ не отримує чужих крихт", () => {
    expect(analysisAncestors("/trackers")).toEqual([]);
  });
});
