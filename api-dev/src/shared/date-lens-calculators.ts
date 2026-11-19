/**
 * Датові розрахунки лінз: дата → вихід системи. Рахує сервер, а таблицю
 * відображення тримає лінза; друга формула тут — друга правда, тому кожна
 * система має рівно одне визначення.
 *
 * @module api-dev/src/shared/date-lens-calculators
 */

import { CHINESE_ANIMALS, MAYAN_DAY_SIGNS } from "@wwwuabot/shared/qualities";

/** Дата `YYYY-MM-DD` як числа; неіснуюча дата повертає `null`, а не сусідній день. */
export function parseIsoDate(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/**
 * Число життєвого шляху: сума всіх цифр дати, згорнута до 1–9; 11 і 22
 * лишаються майстер-числами. Це стандартне правило, а не наша евристика.
 */
export function lifePathOf(date: string): number | null {
  if (!parseIsoDate(date)) return null;
  let value = [...date].reduce((sum, char) => (/\d/.test(char) ? sum + Number(char) : sum), 0);
  while (value > 9 && value !== 11 && value !== 22) {
    value = [...String(value)].reduce((sum, char) => sum + Number(char), 0);
  }
  return value;
}

/**
 * Рік китайського циклу за сонячним Лічунем: до 4 лютого діє попередній рік.
 * Це датова межа, а не місячний календар — точний Новий рік буває 21 січня – 20
 * лютого, і без часу народження ми не беремося вгадувати годину.
 */
export function chineseYearOf(date: string): number | null {
  const parsed = parseIsoDate(date);
  if (!parsed) return null;
  const beforeLichun = parsed.month < 2 || (parsed.month === 2 && parsed.day < 4);
  return beforeLichun ? parsed.year - 1 : parsed.year;
}

/** Тварина року; цикл починається зі Щура (рік 4). */
export function chineseAnimalOf(date: string): string | null {
  const year = chineseYearOf(date);
  if (year === null) return null;
  const index = (((year - 4) % 12) + 12) % 12;
  return CHINESE_ANIMALS[index] ?? null;
}

/** Юліанський день для григоріанської дати — ціле число, без часу. */
export function julianDayOf(date: string): number | null {
  const parsed = parseIsoDate(date);
  if (!parsed) return null;
  const { year, month, day } = parsed;
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Кореляція GMT 584283: 2012-12-21 = 4 Ахау, і від неї рахується кожен день. */
export const MAYAN_CORRELATION = 584283;

export interface TzolkinDay {
  readonly sign: string;
  readonly tone: number;
}

/** День і тон Цолькіна; тон — 1…13, печатка — одна з двадцяти. */
export function tzolkinOf(date: string): TzolkinDay | null {
  const julian = julianDayOf(date);
  if (julian === null) return null;
  const days = julian - MAYAN_CORRELATION;
  return {
    sign: MAYAN_DAY_SIGNS[(((days + 19) % 20) + 20) % 20] ?? "",
    tone: ((((days + 3) % 13) + 13) % 13) + 1,
  };
}
