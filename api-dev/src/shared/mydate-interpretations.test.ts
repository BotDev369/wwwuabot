import { describe, expect, it } from "vitest";
import { SYSTEM_CALCULATORS, type SystemAnalysisResult } from "./mydate-helpers";
import { MEANINGS, meaningFor, withMeanings } from "./mydate-interpretations";

/**
 * Усі дні одного року проходять кожен знак, стихію, хрест, планету й декан —
 * тож одним прогоном дістаємо повний словник значень калькулятора.
 */
function everyValue(systemId: string): Array<{ key: string; value: string }> {
  const calculate = SYSTEM_CALCULATORS[systemId];
  const seen = new Map<string, string>();
  for (let month = 1; month <= 12; month++) {
    const lastDay = new Date(Date.UTC(2001, month, 0)).getUTCDate();
    for (let day = 1; day <= lastDay; day++) {
      const date = `2001-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      for (const parameter of calculate(date).parameters ?? []) {
        seen.set(`${parameter.key}\u0000${String(parameter.value)}`, parameter.key);
      }
    }
  }
  return [...seen.entries()].map(([compound, key]) => ({
    key,
    value: compound.slice(compound.indexOf("\u0000") + 1),
  }));
}

describe("довідник трактувань", () => {
  it("має трактування для кожного значення, яке рахує калькулятор", () => {
    const systems = Object.keys(SYSTEM_CALCULATORS);
    expect(systems.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const systemId of systems) {
      for (const { key, value } of everyValue(systemId)) {
        const hint = meaningFor(systemId, key, value);
        if (!hint || !hint.trim()) missing.push(`${systemId}.${key} = ${value}`);
      }
    }

    // Порожній список — це і є вимога: слово без пояснення людині нічого не каже.
    expect(missing).toEqual([]);
  });

  it("не тримає мертвих рядків: описано рівно те, що буває", () => {
    for (const [systemId, parameters] of Object.entries(MEANINGS)) {
      const produced = new Set(everyValue(systemId).map((it) => `${it.key}\u0000${it.value}`));

      for (const [key, meaning] of Object.entries(parameters)) {
        for (const value of Object.keys(meaning.values ?? {})) {
          expect(produced.has(`${key}\u0000${value}`), `${systemId}.${key} = ${value}`).toBe(true);
        }
        // Параметр із самим лише `general` мусить існувати, інакше він мовчки нічого не робить.
        if (!meaning.values) {
          expect(
            everyValue(systemId).some((it) => it.key === key),
            `${systemId}.${key}`,
          ).toBe(true);
        }
      }
    }
  });

  it("дописує трактування копією, а не в знімку, який іде в D1", () => {
    const result = SYSTEM_CALCULATORS.western("1980-03-03");
    const before = JSON.stringify(result);

    const withHints = withMeanings("western", result);

    expect(withHints).not.toBe(result);
    expect(JSON.stringify(result)).toBe(before);
    expect((withHints.parameters ?? [])[0].hint).toBeTruthy();
    expect((result.parameters ?? [])[0].hint).toBeUndefined();
    expect((withHints.parameters ?? [])[0].value).toBe((result.parameters ?? [])[0].value);
  });

  it("невідома система лишається без трактувань, а не падає", () => {
    const result: SystemAnalysisResult = {
      parameters: [{ key: "whatever", label: "Щось", value: "значення" }],
    };

    const mapped = withMeanings("майбутня-система", result);

    expect(mapped.parameters).toEqual([{ key: "whatever", label: "Щось", value: "значення" }]);
    expect(meaningFor("майбутня-система", "whatever", "значення")).toBeUndefined();
  });
});
