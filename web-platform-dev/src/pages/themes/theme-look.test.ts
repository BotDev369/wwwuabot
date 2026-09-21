/**
 * «Що вибрано зараз» — правило, яке ламається мовчки.
 *
 * Помилка тут не видна оком: пункт хабу просто скаже «Свої кольори» замість
 * назви теми, і ніхто не дізнається, що порівняння розійшлося на літеру. Тому
 * перевіряємо рівно ті випадки, де відповідь неочевидна: хто виграє при
 * збігові, що буває до приїзду списків і коли вибір неповний.
 *
 * @module web-platform-dev/src/pages/themes/theme-look.test
 */

import { describe, expect, it } from "vitest";
import type { ThemeScheme } from "@wwwuabot/shared/themes";
import {
  BRAND_LOOK,
  OWN_COLORS,
  describeTheme,
  type AppliedChoice,
  type LookSources,
} from "./theme-look";

/** Схема з мінімумом полів: решта для порівняння не потрібна. */
function theme(id: number, name: string, bg: string, font = ""): ThemeScheme {
  return {
    id,
    ownerId: 1,
    name,
    bg,
    text: "#eeeeee",
    accent: "#ff0000",
    font,
    isPublic: false,
    createdAt: "",
    updatedAt: "",
  };
}

const DUSK = theme(7, "Сутінки", "#1b1b2f");
const GUEST = theme(9, "Чужа", "#0d1b2a");

const CHOICE: AppliedChoice = {
  colors: { bg: "#1b1b2f", text: "#eeeeee", accent: "#ff0000" },
  font: "",
  complete: true,
};

const SOURCES: LookSources = {
  mine: [DUSK],
  shared: [GUEST],
  palettes: [{ label: "Ніч", bg: "#0b0b0f", text: "#f2f3f7", accent: "#7aa2ff" }],
  pending: false,
};

describe("describeTheme", () => {
  it("своя тема називається своїм ім'ям", () => {
    expect(describeTheme(CHOICE, SOURCES)).toBe("«Сутінки»");
  });

  it("тема з простору каже, звідки вона", () => {
    expect(describeTheme({ ...CHOICE, colors: { ...GUEST } }, SOURCES)).toBe("«Чужа» · з простору");
  });

  it("своя тема важливіша за чужу з тими самими кольорами", () => {
    // Інакше людина бачила б на своєму екрані чуже ім'я — і не зрозуміла б,
    // чому її тема зникла.
    const shared = [{ ...DUSK, id: 99, name: "Клон з простору" }];
    expect(describeTheme(CHOICE, { ...SOURCES, shared })).toBe("«Сутінки»");
  });

  it("готова палітра називається так, як її звуть у списку", () => {
    const colors = { bg: "#0b0b0f", text: "#f2f3f7", accent: "#7aa2ff" };
    expect(describeTheme({ ...CHOICE, colors }, SOURCES)).toBe("Ніч");
  });

  it("вибір, якого немає в жодному списку, — «Свої кольори»", () => {
    const colors = { bg: "#123456", text: "#eeeeee", accent: "#ff0000" };
    expect(describeTheme({ ...CHOICE, colors }, SOURCES)).toBe(OWN_COLORS);
  });

  it("шрифт — частина вибору: та сама трійка з іншим шрифтом уже не «та тема»", () => {
    expect(describeTheme({ ...CHOICE, font: "lora" }, SOURCES)).toBe(OWN_COLORS);
  });

  it("неповний вибір — це ще палітра стилю, а не вибір людини", () => {
    expect(describeTheme({ ...CHOICE, colors: {}, complete: false }, SOURCES)).toBe(BRAND_LOOK);
  });

  it("⛔ поки списки їдуть, «Свої кольори» не показуємо", () => {
    // Сказати «Свої кольори», а за секунду замінити на «Сутінки» — це смикнути
    // екран; краще не сказати нічого (другий рядок лишається порожнім).
    const colors = { bg: "#123456", text: "#eeeeee", accent: "#ff0000" };
    expect(
      describeTheme({ ...CHOICE, colors }, { ...SOURCES, mine: [], shared: [], pending: true }),
    ).toBeNull();
  });
});
