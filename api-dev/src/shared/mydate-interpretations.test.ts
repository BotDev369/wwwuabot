import { describe, expect, it } from "vitest";
import { SYSTEM_CALCULATORS, type SystemAnalysisResult } from "./mydate-helpers";
import { MEANINGS } from "./mydate-interpretations";
import {
  aboutFor,
  meaningFor,
  withMeanings,
  withParameterAbout,
} from "./mydate-interpretation-helpers";

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
        const meaning = meaningFor(systemId, key, value);
        if (!meaning || !meaning.trim()) missing.push(`${systemId}.${key} = ${value}`);
      }
    }

    // Порожній список — це і є вимога: слово без пояснення людині нічого не каже.
    expect(missing).toEqual([]);
  });

  /**
   * Перший шар довідника: пояснення самого параметра — «що визначаємо».
   * Без нього значення лишається словом без контексту, саме на це й була скарга.
   */
  it("має пояснення для кожного параметра, який рахує калькулятор", () => {
    const missing: string[] = [];
    for (const systemId of Object.keys(SYSTEM_CALCULATORS)) {
      for (const key of new Set(everyValue(systemId).map((it) => it.key))) {
        const about = aboutFor(systemId, key);
        if (!about || !about.trim()) missing.push(`${systemId}.${key}`);
      }
    }

    expect(missing).toEqual([]);
  });

  /**
   * Ключ довідника **рахованої** системи мусить десь бути: інакше це пояснення,
   * яке ніколи не побачать. Системи без формули сюди не входять: їхній `about`
   * показує вітрина `analysis-systems`, де дат немає взагалі, тож перелік
   * заводить реєстр заздалегідь (міграція 13).
   */
  it("не тримає параметрів, яких калькулятор не рахує", () => {
    for (const [systemId, parameters] of Object.entries(MEANINGS)) {
      if (!SYSTEM_CALCULATORS[systemId]) continue;
      const produced = new Set(everyValue(systemId).map((it) => it.key));
      for (const key of Object.keys(parameters)) {
        expect(produced.has(key), `${systemId}.${key}`).toBe(true);
      }
    }
  });

  /**
   * Система без формули — це обіцянка: довідник знає, **що** міряє параметр,
   * але значень ще нікому рахувати, тож `values`/`general` там зайві.
   */
  it("у системи без формули — пояснення без трактувань", () => {
    for (const [systemId, parameters] of Object.entries(MEANINGS)) {
      if (SYSTEM_CALCULATORS[systemId]) continue;
      for (const [key, meaning] of Object.entries(parameters)) {
        expect(meaning.about.trim(), `${systemId}.${key}`).not.toBe("");
        expect(meaning.values, `${systemId}.${key}`).toBeUndefined();
        expect(meaning.general, `${systemId}.${key}`).toBeUndefined();
      }
    }
  });

  it("не тримає мертвих рядків: описано рівно те, що буває", () => {
    for (const [systemId, parameters] of Object.entries(MEANINGS)) {
      if (!SYSTEM_CALCULATORS[systemId]) continue;
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

  it("дописує пояснення й трактування копією, а не в знімку, який іде в D1", () => {
    const result = SYSTEM_CALCULATORS.western("1980-03-03");
    const before = JSON.stringify(result);

    const withHints = withMeanings("western", result);
    const first = (withHints.parameters ?? [])[0];

    expect(withHints).not.toBe(result);
    expect(JSON.stringify(result)).toBe(before);
    expect(first.about).toBeTruthy();
    expect(first.meaning).toBeTruthy();
    expect((result.parameters ?? [])[0].about).toBeUndefined();
    expect((result.parameters ?? [])[0].meaning).toBeUndefined();
    expect(first.value).toBe((result.parameters ?? [])[0].value);
  });

  /**
   * Вітрина систем показує параметри з поясненнями без жодної дати: `about`
   * дописує саме ця функція, а не рядок реєстру в D1.
   */
  it("дописує пояснення параметрам реєстру, не чіпаючи сам реєстр", () => {
    const fromRegistry = [{ key: "sunSign", label: "Знак Сонця" }];
    const decorated = withParameterAbout("western", fromRegistry);

    expect(decorated[0].about).toBe(aboutFor("western", "sunSign"));
    expect(decorated[0].label).toBe("Знак Сонця");
    expect(fromRegistry[0]).toEqual({ key: "sunSign", label: "Знак Сонця" });
  });

  it("параметр без пояснення лишається підписом: `about` не вигадується", () => {
    const decorated = withParameterAbout("майбутня-система", [{ key: "x", label: "Щось" }]);

    expect(decorated).toEqual([{ key: "x", label: "Щось" }]);
    expect("about" in decorated[0]).toBe(false);
  });

  it("невідома система лишається без трактувань, а не падає", () => {
    const result: SystemAnalysisResult = {
      parameters: [{ key: "whatever", label: "Щось", value: "значення" }],
    };

    const mapped = withMeanings("майбутня-система", result);

    expect(mapped.parameters).toEqual([{ key: "whatever", label: "Щось", value: "значення" }]);
    expect(aboutFor("майбутня-система", "whatever")).toBeUndefined();
    expect(meaningFor("майбутня-система", "whatever", "значення")).toBeUndefined();
  });
});
