import { describe, expect, it } from "vitest";
import {
  chineseAnimalOf,
  chineseProfile,
  julianDayOf,
  lifePathOf,
  mayanProfile,
  numerologyProfile,
  parseIsoDate,
} from "./date-lens-calculators";

describe("parseIsoDate", () => {
  it("не існуючу дату не зсуває на сусідню", () => {
    expect(parseIsoDate("1980-02-30")).toBeNull();
    expect(parseIsoDate("03.03.1980")).toBeNull();
    expect(parseIsoDate("1980-03-03")).toEqual({ year: 1980, month: 3, day: 3 });
  });
});

describe("нумерологічний профіль", () => {
  it("1980-03-03: шлях 6, день 3, ставлення 6, рік 7, піки й виклики", () => {
    const profile = numerologyProfile("1980-03-03", 2026);
    expect(profile).not.toBeNull();
    expect(profile?.lifePath).toBe(6);
    expect(profile?.lifePathChain).toEqual([15, 6]);
    expect(profile?.birthday).toBe(3);
    expect(profile?.attitude).toBe(6);
    expect(profile?.personalYear).toBe(7);
    expect(profile?.pinnacles).toEqual([6, 3, 9, 3]);
    expect(profile?.challenges).toEqual([0, 6, 6, 6]);
    expect(profile?.pinnacleAges).toEqual([0, 30, 39, 48]);
    expect(profile?.karmicDebt).toBeNull();
  });

  it("майстер-числа 11/22 лишаються, а 19 у році стає кармічним боргом", () => {
    const profile = numerologyProfile("1990-11-29", 2026);
    expect(profile?.lifePath).toBe(5);
    expect(profile?.birthday).toBe(11);
    expect(profile?.attitude).toBe(22);
    expect(profile?.karmicDebt).toBe(19);
    expect(profile?.karmicWhere).toContain("1990");
  });

  it("кармічний борг 13 у сумі дати не ховається", () => {
    const profile = numerologyProfile("1980-01-03", 2026);
    expect(profile?.lifePath).toBe(4);
    expect(profile?.karmicDebt).toBe(13);
  });

  it("таймінг-цикли не тримають майстер-чисел", () => {
    const profile = numerologyProfile("1990-11-29", 2026);
    expect(profile?.personalYear).toBeLessThanOrEqual(9);
    expect(profile?.challenges.every((value) => value <= 8)).toBe(true);
  });

  it("1987-11-29: 11 + 11 + 7 = 29 → 11", () => {
    expect(lifePathOf("1987-11-29")).toBe(11);
  });
});

describe("китайські стовпи", () => {
  it("день 2000-01-01 — 戊午 (У-У), канонічний якір", () => {
    expect(chineseProfile("2000-01-01")?.day.label).toBe("У-У");
  });

  it("день 1949-10-01 — 甲子 (Цзя-Цзи)", () => {
    expect(chineseProfile("1949-10-01")?.day.label).toBe("Цзя-Цзи");
  });

  it("1980-03-03: рік Ґен-Шень (метал, ян, Мавпа), місяць У-Інь до Цзін Чже", () => {
    const profile = chineseProfile("1980-03-03");
    expect(profile?.year.label).toBe("Ґен-Шень");
    expect(profile?.year.animal).toBe("Мавпа");
    expect(profile?.year.element).toBe("Метал");
    expect(profile?.year.polarity).toBe("ян");
    expect(profile?.month.label).toBe("У-Інь");
    expect(profile?.monthIndex).toBe(0);
    expect(profile?.solarTerm).toBe("Лі Чунь");
    expect(profile?.day.label).toBe("Ї-Хай");
  });

  it("рік змінюється на Лічунь, а не 1 січня", () => {
    expect(chineseAnimalOf("1980-02-03")).toBe("Коза");
    expect(chineseAnimalOf("1980-02-05")).toBe("Мавпа");
  });

  it("місяць іде за сонячним терміном: 6 березня вже Кріль", () => {
    const profile = chineseProfile("1980-03-06");
    expect(profile?.month.branchIndex).toBe(3);
    expect(profile?.solarTerm).toBe("Цзін Чже");
  });
});

describe("Цолькін", () => {
  it("2012-12-21 = 4 Ахау, кін 160, хвиля 13, довга лічба 13.0.0.0.0", () => {
    const profile = mayanProfile("2012-12-21");
    expect(profile?.kin).toBe(160);
    expect(profile?.tone).toBe(4);
    expect(profile?.seal).toBe("Ахау");
    expect(profile?.trecena).toBe(13);
    expect(profile?.wave).toBe("1 Кабан");
    expect(profile?.longCount).toBe("13.0.0.0.0");
  });

  it("2000-01-01 = 11 Ік, кін 102", () => {
    const profile = mayanProfile("2000-01-01");
    expect(profile?.kin).toBe(102);
    expect(profile?.tone).toBe(11);
    expect(profile?.seal).toBe("Ік");
    expect(profile?.trecena).toBe(8);
  });

  it("1980-03-03 = 9 Кауак, кін 139", () => {
    const profile = mayanProfile("1980-03-03");
    expect(profile?.kin).toBe(139);
    expect(profile?.tone).toBe(9);
    expect(profile?.seal).toBe("Кауак");
  });

  it("юліанський день 2000-01-01 — 2451545", () => {
    expect(julianDayOf("2000-01-01")).toBe(2451545);
  });
});
