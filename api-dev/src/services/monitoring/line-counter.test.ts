/**
 * Тести лічильника рядків.
 *
 * Перевіряється саме правило класифікації: публічний показник «рядків
 * коментарів» існує тільки тому, що комусь треба відрізнити код від
 * коментарів, — і якщо правило мовчки зміниться, динаміка стане
 * безглуздою, хоч числа й лишаться схожими.
 *
 * @module api-dev/src/services/monitoring/line-counter.test
 */

import { describe, expect, it } from "vitest";
import { classifyLine, createLineCounter, type CommentStyle } from "./line-counter";

function count(text: string, style: CommentStyle, chunkSize = 5) {
  const counter = createLineCounter(style);
  const bytes = new TextEncoder().encode(text);
  for (let i = 0; i < bytes.length; i += chunkSize) {
    counter.push(bytes.subarray(i, i + chunkSize));
  }
  return counter.counts();
}

describe("класифікація рядка", () => {
  const cases: Array<[string, CommentStyle, "blank" | "code" | "comment"]> = [
    ["", "slash", "blank"],
    ["   \t ", "slash", "blank"],
    ["const a = 1;", "slash", "code"],
    ["  // пояснення", "slash", "comment"],
    ["// повністю", "slash", "comment"],
    ["const url = 'https://x';", "slash", "code"],
    ["# коментар", "hash", "comment"],
    ["const a = 1;", "hash", "code"],
    ["-- SQL", "dash", "comment"],
    ["SELECT 1", "dash", "code"],
    ["текст", "none", "code"],
  ];

  it.each(cases)("«%s» у стилі %s → %s", (line, style, expected) => {
    const bytes = [...new TextEncoder().encode(line)];
    expect(classifyLine(bytes, style, { inBlock: false })).toBe(expected);
  });

  it("закриття блочного коментаря без коду лишає рядок коментарем", () => {
    const bytes = [...new TextEncoder().encode("   */")];
    expect(classifyLine(bytes, "slash", { inBlock: true })).toBe("comment");
  });

  it("код після закриття блоку робить рядок кодом", () => {
    const bytes = [...new TextEncoder().encode("*/ const a = 1;")];
    expect(classifyLine(bytes, "slash", { inBlock: true })).toBe("code");
  });
});

describe("лічильник файлу", () => {
  it("рахує код, коментарі й порожні", () => {
    const source = [
      "/**",
      " * Опис.",
      " */",
      "const a = 1;",
      "",
      "// наступний",
      "const b = 2;",
    ].join("\n");

    expect(count(source, "slash")).toEqual({ lines: 7, blank: 1, comment: 4, code: 2 });
  });

  it("багаторядковий блок не «залипає» на наступних рядках", () => {
    const source = ["/*", "всередині", "*/", "code();"].join("\n");
    expect(count(source, "slash")).toEqual({ lines: 4, blank: 0, comment: 3, code: 1 });
  });

  it("рядок без завершального переносу теж рахується", () => {
    expect(count("a\nb", "slash")).toEqual({ lines: 2, blank: 0, comment: 0, code: 2 });
  });

  it("не залежить від того, як нарізані шматки", () => {
    const source = "const a = 1;\n// x\n\n";
    const whole = count(source, "slash", source.length);
    const byByte = count(source, "slash", 1);
    expect(byByte).toEqual(whole);
  });

  it("дуже довгий рядок рахується кодом, а не пам'яттю", () => {
    const counts = count(`const a = [${"1,".repeat(600)}];\n`, "slash");
    expect(counts).toEqual({ lines: 1, blank: 0, comment: 0, code: 1 });
  });

  it("стиль `none` не вважає коментарем нічого", () => {
    expect(count("# не коментар\nрядок\n", "none")).toEqual({
      lines: 2,
      blank: 0,
      comment: 0,
      code: 2,
    });
  });
});
