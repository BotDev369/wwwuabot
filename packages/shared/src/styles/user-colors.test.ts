/**
 * Сторож трьох кольорів — правила, які інакше ламаються **мовчки**.
 *
 * Що саме тут ловиться:
 *
 *   1. **Порожній слот не зберігається.** «Не можна лишати пустим жоден із
 *      трьох» — це правило продукту, і воно живе у `isCompleteColors` /
 *      `parseStoredColors`. Помилка тут виглядала б як застосунок, залитий
 *      чужими кольорами після перезавантаження.
 *   2. **Читабельність.** `onAccentColor` вибирає підпис на акцентній плашці, а
 *      `contrastWarning` каже, коли текст злився з фоном. Обидва — чисті
 *      функції саме тому, що «щось нечитабельне на екрані» очима не перевіриш.
 *   3. **CSS справді читає ці три змінні.** Якщо `user-colors.css` перестане
 *      їх згадувати (або його не імпортують), панель буде працювати, а екран —
 *      ні: ані компілятор, ані тести цього не побачать.
 *
 * @module packages/shared/src/styles/user-colors.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hexToHsl, hslToHex, normalizeHex } from "./color";
import {
  COLORS_ATTR,
  COLORS_MODE_ATTR,
  applyColors,
  colorsMode,
  contrastWarning,
  isCompleteColors,
  isSameColors,
  missingSlots,
  onAccentColor,
  parseStoredColors,
  type UserColors,
} from "./user-colors";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const WHITE = "#ffffff";
const BLACK = "#000000";

const COMPLETE: UserColors = { bg: "#101014", text: "#f4f4f6", accent: "#7aa2ff" };

describe("hex", () => {
  it("короткий запис розгортає до шести цифр", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("  #AABBCC ")).toBe("#aabbcc");
  });

  it("не-колір — це не колір", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("rgb(1,2,3)")).toBeNull();
  });
});

describe("три кольори обов'язкові", () => {
  it("порожній вибір не має жодного слота", () => {
    expect(missingSlots({})).toEqual(["bg", "text", "accent"]);
    expect(isCompleteColors({})).toBe(false);
  });

  it("двох кольорів замало — зберегти не можна", () => {
    expect(isCompleteColors({ bg: BLACK, text: WHITE })).toBe(false);
    expect(missingSlots({ bg: BLACK, text: WHITE })).toEqual(["accent"]);
  });

  it("усі три — можна", () => {
    expect(isCompleteColors(COMPLETE)).toBe(true);
    expect(contrastWarning(COMPLETE)).toBeNull();
  });

  it("з локальної пам'яті бере тільки повний вибір", () => {
    expect(parseStoredColors(JSON.stringify(COMPLETE))).toEqual(COMPLETE);
    expect(parseStoredColors(JSON.stringify({ bg: BLACK, text: WHITE }))).toBeNull();
    expect(parseStoredColors("не json")).toBeNull();
    expect(parseStoredColors(null)).toBeNull();
  });

  it("читає короткий запис і відкидає сміття в слоті", () => {
    const parsed = parseStoredColors('{"bg":"#fff","text":"#000","accent":"#abc"}');
    expect(parsed).toEqual({ bg: "#ffffff", text: "#000000", accent: "#aabbcc" });
    expect(parseStoredColors('{"bg":"#fff","text":"#000","accent":{"a":1}}')).toBeNull();
  });

  it("порівняння виборів не плутає «те саме» з «інше»", () => {
    expect(isSameColors(COMPLETE, { ...COMPLETE })).toBe(true);
    expect(isSameColors(COMPLETE, { ...COMPLETE, accent: "#ff0000" })).toBe(false);
    expect(isSameColors(COMPLETE, {})).toBe(false);
  });
});

describe("схема виводиться з фону", () => {
  it("світлий фон — світла схема", () => {
    expect(colorsMode(WHITE)).toBe("light");
    expect(colorsMode("#f6f1e7")).toBe("light");
  });

  it("темний фон — темна", () => {
    expect(colorsMode(BLACK)).toBe("dark");
    expect(colorsMode("#101014")).toBe("dark");
  });
});

describe("читабельність", () => {
  it("підпис на акценті — той, хто далі від акценту", () => {
    // Акцент світлий: на ньому читається чорний фон, а не білий текст.
    const light = onAccentColor({ bg: BLACK, text: WHITE, accent: "#facc15" });
    expect(light).toBe(BLACK);
    expect(onAccentColor({ bg: WHITE, text: BLACK, accent: "#1d4ed8" })).toBe(WHITE);
  });

  it("текст, що злився з фоном, — це попередження", () => {
    expect(contrastWarning({ bg: "#f0f0f0", text: "#e8e8e8", accent: "#2563eb" })).toContain(
      "замало відрізняється",
    );
  });

  it("акцент, невидимий на фоні, — теж попередження", () => {
    expect(contrastWarning({ bg: BLACK, text: WHITE, accent: "#0b0b0f" })).toContain("зливається");
  });
});

describe("HSL ↔ hex", () => {
  it("сірий лишається сірим", () => {
    expect(hslToHex({ h: 0, s: 0, l: 50 })).toBe("#808080");
  });

  it("повертається тим самим кольором", () => {
    const hex = hslToHex({ h: 212, s: 90, l: 62 });
    const back = hexToHsl(hex);
    expect(back).not.toBeNull();
    expect(hslToHex(back!)).toBe(hex);
  });
});

describe("applyColors ставить три сіди на <html>", () => {
  interface FakeRoot {
    attributes: Map<string, string>;
    props: Map<string, string>;
  }

  function stubDocument(): FakeRoot {
    const root: FakeRoot = { attributes: new Map(), props: new Map() };
    vi.stubGlobal("document", {
      documentElement: {
        setAttribute: (name: string, value: string) => root.attributes.set(name, value),
        removeAttribute: (name: string) => root.attributes.delete(name),
        style: {
          setProperty: (name: string, value: string) => root.props.set(name, value),
          removeProperty: (name: string) => root.props.delete(name),
        },
      },
    });
    return root;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ставит змінні, атрибут і схему з фону", () => {
    const root = stubDocument();
    applyColors(COMPLETE);

    expect(root.props.get("--user-bg")).toBe(COMPLETE.bg);
    expect(root.props.get("--user-text")).toBe(COMPLETE.text);
    expect(root.props.get("--user-accent")).toBe(COMPLETE.accent);
    // Акцент світлий, тож підпис на ньому — темний фон, а не світлий текст.
    expect(root.props.get("--user-on-accent")).toBe(COMPLETE.bg);
    expect(root.attributes.get(COLORS_ATTR)).toBe("custom");
    expect(root.attributes.get(COLORS_MODE_ATTR)).toBe("dark");
  });

  it("прибирає все дочиста — інакше вибір не відпустити", () => {
    const root = stubDocument();
    applyColors(COMPLETE);
    applyColors(null);

    expect(root.attributes.size).toBe(0);
    expect(root.props.size).toBe(0);
  });
});

describe("CSS справді читає три кольори", () => {
  const css = readFileSync(join(REPO_ROOT, "packages/shared/src/styles/user-colors.css"), "utf8");
  const index = readFileSync(join(REPO_ROOT, "packages/shared/src/styles/index.css"), "utf8");

  it("файл імпортовано в спільну систему стилів", () => {
    expect(index).toContain("./user-colors.css");
  });

  it("палітра виведена з усіх трьох сідів", () => {
    for (const variable of ["--user-bg", "--user-text", "--user-accent"]) {
      expect(css).toContain(`var(${variable})`);
    }
  });

  it("токени оголошені на тому рівні, який перекриває бренд", () => {
    // Бренд пише токени на `[data-brand][data-theme]` — це (0,2,0). Один
    // `[data-colors]` (0,1,1) програв би йому мовчки, тож потрібні два атрибути.
    expect(css).toContain('html[data-colors][data-colors-mode="light"]');
    expect(css).toContain('html[data-colors][data-colors-mode="dark"]');
  });
});
