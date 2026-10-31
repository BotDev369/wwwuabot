/**
 * Контракт Є-data: курсор пагінації й формат періоду.
 *
 * Курсор — це ключ наступної сторінки, тож «не розібрано» мусить бути `null`,
 * а не першою сторінкою: інакше «показати ще» тихо починало б список з
 * початку й показувало ті самі рядки вдруге.
 * @module @wwwuabot/shared/spending/index.test
 */

import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, isPeriod } from "./index";

describe("курсор", () => {
  it("кодує пару «дата + id» і читає її назад", () => {
    expect(decodeCursor(encodeCursor("2026-09-10", "doc-1"))).toEqual({
      date: "2026-09-10",
      id: "doc-1",
    });
  });

  it("роздільник усередині id не рве курсор", () => {
    expect(encodeCursor("2026-09-10", "a|b")).toContain("%7C");
    expect(decodeCursor(encodeCursor("2026-09-10", "a|b"))).toEqual({
      date: "2026-09-10",
      id: "a|b",
    });
  });

  it("порожній або зіпсований курсор — `null`, а не перша сторінка", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("без-роздільника")).toBeNull();
    expect(decodeCursor("|id")).toBeNull();
    expect(decodeCursor("date|")).toBeNull();
  });

  it("криве відсоткове кодування не валить розбір", () => {
    expect(decodeCursor("%E0%A4%A|x")).toBeNull();
  });
});

describe("період", () => {
  it("приймає лише `YYYY-MM` із місяцем від 01 до 12", () => {
    expect(isPeriod("2026-09")).toBe(true);
    expect(isPeriod("2026-13")).toBe(false);
    expect(isPeriod("2026-00")).toBe(false);
    expect(isPeriod("2026-9")).toBe(false);
    expect(isPeriod("2026-09-01")).toBe(false);
  });
});
