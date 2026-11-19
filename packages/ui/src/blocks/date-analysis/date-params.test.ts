/**
 * Параметри адреси аналізу: одна читка на всі кроки, тож «сміття» в адресі не
 * має ставати датою, системою чи згодою на опитування.
 *
 * @module packages/ui/src/blocks/date-analysis/date-params.test
 */

import { describe, expect, it } from "vitest";
import { LENSES } from "@wwwuabot/shared/qualities";
import { listFrom, readDates, readLenses, readSubject, readSurvey } from "./date-params";

describe("параметри аналізу", () => {
  it("перелік не містить порожніх значень", () => {
    expect(listFrom(null)).toEqual([]);
    expect(listFrom("")).toEqual([]);
    expect(listFrom("a,,b")).toEqual(["a", "b"]);
  });

  it("дати читаються з `dates` і старого `date`, без повторів і сміття", () => {
    expect(readDates("?dates=1980-03-03,1991-12-31")).toEqual(["1980-03-03", "1991-12-31"]);
    expect(readDates("?date=1980-03-03")).toEqual(["1980-03-03"]);
    expect(readDates("?dates=1980-03-03&date=1980-03-03")).toEqual(["1980-03-03"]);
    expect(readDates("?dates=1980-13-40,abc")).toEqual([]);
    expect(readDates("")).toEqual([]);
  });

  it("лінзи — тільки відомі системи, без повторів", () => {
    const first = LENSES[0].id;
    const second = LENSES[1].id;

    expect(readLenses(`?lenses=${first},${first},nope`)).toEqual([first]);
    expect(readLenses(`?lenses=${first},${second}`)).toEqual([first, second]);
    expect(readLenses("")).toEqual([]);
  });

  it("опитування — тільки явне `survey=1`", () => {
    expect(readSurvey("?survey=1")).toBe(true);
    expect(readSurvey("?survey=0")).toBe(false);
    expect(readSurvey("")).toBe(false);
  });

  it("підписи тримаються дат: зайві відкидаються, відсутні не зсувають", () => {
    const subject = readSubject("?labels=Іван|Олена|Зайвий", 2);
    expect(subject.labels).toEqual(["Іван", "Олена"]);

    const short = readSubject("?labels=Іван", 2);
    expect(short.labels).toEqual(["Іван"]);

    const self = readSubject("?self=1", 1);
    expect(self.self).toBe(true);
  });
});
