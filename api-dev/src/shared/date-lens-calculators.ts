/**
 * Канонічні профілі датових систем: дата → показники, з яких лінза бере рівні.
 * Одна формула на систему: нумерологія згортає частини окремо, китайські стовпи
 * йдуть від сонячної довготи, Цолькін — від юліанського дня. Таблиці правил — у
 * лінзах, тут лише арифметика. Формули: `specs/analysis-core/07-systems.md`.
 *
 * @module api-dev/src/shared/date-lens-calculators
 */

import {
  CHINESE_ANIMALS,
  MAYAN_DAY_SIGNS,
  chineseBranch,
  chineseStem,
  mayanSeal,
  mayanTone,
  type ChineseProfile,
  type MayanProfile,
  type NumerologyProfile,
  type Pillar,
} from "@wwwuabot/shared/qualities";
import { sunLongitude } from "./western-calculator";

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

const MASTERS = [11, 22, 33] as const;

function digitsSum(value: number): number {
  return [...String(value)].reduce((sum, char) => sum + Number(char), 0);
}

/** Згортання з ланцюгом: зупиняється на 1–9 або майстер-числі. */
function reduceKeepingMaster(value: number): { value: number; chain: number[] } {
  const chain: number[] = [];
  let current = Math.abs(value);
  while (current > 9 && !(MASTERS as readonly number[]).includes(current)) {
    chain.push(current);
    current = digitsSum(current);
  }
  chain.push(current);
  return { value: current, chain };
}

/** Повне згортання до 1–9: для часових циклів майстер-числа не лишаються. */
function digitalRoot(value: number): number {
  let current = Math.abs(value);
  while (current > 9) current = digitsSum(current);
  return current;
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

/**
 * Нумерологічний профіль: шість показників. `currentYear` — календарний рік,
 * для якого рахується особистий рік; передається явно, щоб результат був
 * відтворюваним у тестах.
 */
export function numerologyProfile(date: string, currentYear: number): NumerologyProfile | null {
  const parsed = parseIsoDate(date);
  if (!parsed) return null;
  const { month, day, year } = parsed;

  const m = reduceKeepingMaster(month);
  const d = reduceKeepingMaster(day);
  const y = reduceKeepingMaster(digitsSum(year));
  const total = reduceKeepingMaster(m.value + d.value + y.value);

  const karmicCandidates = [...m.chain, ...d.chain, ...y.chain, ...total.chain];
  const karmicDebt = karmicCandidates.find((value) => [13, 14, 16, 19].includes(value)) ?? null;
  const karmicWhere =
    karmicDebt === null
      ? null
      : karmicDebt === 13 || karmicDebt === 14
        ? `сума дати ${karmicDebt}`
        : `рік ${year} згортається через ${karmicDebt}`;

  const lifePath = total.value;
  const lifePathRoot = digitalRoot(lifePath);
  const firstEnd = 36 - lifePathRoot;
  const pinnacleAges = [0, firstEnd, firstEnd + 9, firstEnd + 18] as const;

  const p1 = reduceKeepingMaster(m.value + d.value).value;
  const p2 = reduceKeepingMaster(d.value + y.value).value;
  const p3 = reduceKeepingMaster(p1 + p2).value;
  const p4 = reduceKeepingMaster(m.value + y.value).value;

  const cm = digitalRoot(month);
  const cd = digitalRoot(day);
  const cy = digitalRoot(digitsSum(year));
  const c1 = Math.abs(cm - cd);
  const c2 = Math.abs(cd - cy);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(cm - cy);

  const partSum = m.value + d.value + y.value;
  const lifePathChain = total.chain[0] === partSum ? total.chain : [partSum, ...total.chain];

  return {
    date,
    lifePath,
    lifePathChain,
    birthday: d.value,
    attitude: reduceKeepingMaster(m.value + d.value).value,
    personalYear: digitalRoot(month + day + digitsSum(currentYear)),
    personalYearOf: currentYear,
    pinnacles: [p1, p2, p3, p4],
    challenges: [c1, c2, c3, c4],
    pinnacleAges,
    karmicDebt,
    karmicWhere,
  };
}

function buildPillar(stemIndex: number, branchIndex: number): Pillar {
  const stem = chineseStem(stemIndex);
  const branch = chineseBranch(branchIndex);
  if (!stem || !branch) throw new Error("Стовп поза 60-річним циклом.");
  return {
    stem: `${stem.name} ${stem.sign}`,
    branch: `${branch.name} ${branch.sign}`,
    label: `${stem.name}-${branch.name}`,
    element: stem.element,
    polarity: stem.polarity,
    animal: branch.animal,
    branchIndex,
  };
}

/**
 * Китайські стовпи. Місяць — за 30-градусними секторами від Лічуню (315°),
 * рік — за Лічунем, день — за безперервним 60-денним циклом від JDN.
 */
export function chineseProfile(date: string): ChineseProfile | null {
  const parsed = parseIsoDate(date);
  if (!parsed) return null;
  const noon = sunLongitude(date, 12);
  const start = sunLongitude(date, 0);
  const end = sunLongitude(date, 24);
  const monthIndex = Math.floor(((((noon - 315) % 360) + 360) % 360) / 30);
  const monthStart = Math.floor(((((start - 315) % 360) + 360) % 360) / 30);
  const monthEnd = Math.floor(((((end - 315) % 360) + 360) % 360) / 30);

  const beforeLichun = (monthIndex === 10 || monthIndex === 11) && parsed.month <= 2;
  const solarYear = beforeLichun ? parsed.year - 1 : parsed.year;

  const yearSexagenary = (((solarYear - 4) % 60) + 60) % 60;
  const yearStem = yearSexagenary % 10;
  const yearBranch = yearSexagenary % 12;

  const monthBranch = (2 + monthIndex) % 12;
  const monthStem = ((yearStem % 5) * 2 + 2 + monthIndex) % 10;

  const jdn = julianDayOf(date);
  if (jdn === null) return null;
  const daySexagenary = (((jdn + 49) % 60) + 60) % 60;
  const dayStem = daySexagenary % 10;
  const dayBranch = daySexagenary % 12;

  const year = buildPillar(yearStem, yearBranch);
  const month = buildPillar(monthStem, monthBranch);
  const day = buildPillar(dayStem, dayBranch);

  // Термін змінюється за добу — це межа, а не привід вибрати середину.
  const termShift = monthStart !== monthEnd || monthStart !== monthIndex;
  return {
    date,
    solarLongitude: noon,
    solarTerm: termShift ? "межа сонячного терміну" : solarTermName(monthIndex),
    solarYear,
    year,
    month,
    day,
    monthIndex,
  };
}

const TERMS = [
  "Лі Чунь",
  "Цзін Чже",
  "Цін Мін",
  "Лі Ся",
  "Ман Чжун",
  "Сяо Шу",
  "Лі Цю",
  "Бай Лу",
  "Хань Лу",
  "Лі Дун",
  "Да Сюе",
  "Сяо Хань",
] as const;

/** Назва терміну за індексом місяця від Лічуню. */
export function solarTermName(monthIndex: number): string {
  return TERMS[monthIndex] ?? "невідомий термін";
}

/** Кореляція GMT 584283: 2012-12-21 = 4 Ахау, кін 160. */
export const MAYAN_CORRELATION = 584283;

/** Цолькін: кін, тон, печатка, хвиля й довга лічба. */
export function mayanProfile(date: string): MayanProfile | null {
  const jdn = julianDayOf(date);
  if (jdn === null) return null;
  const days = jdn - MAYAN_CORRELATION;
  const kin = ((((days + 159) % 260) + 260) % 260) + 1;
  const tone = ((((days + 3) % 13) + 13) % 13) + 1;
  const sealIndex = ((((days + 19) % 20) + 20) % 20) % 20;
  const seal = mayanSeal(sealIndex);
  const toneName = mayanTone(tone);
  if (!seal || !toneName) throw new Error("Цолькін поза таблицею печаток або тонів.");

  const trecena = Math.floor((kin - 1) / 13) + 1;
  const waveKin = (trecena - 1) * 13 + 1;
  const waveSeal = MAYAN_DAY_SIGNS[(waveKin - 1) % 20] ?? seal;

  const longCount = [
    Math.floor(days / 144000),
    Math.floor((days % 144000) / 7200),
    Math.floor((days % 7200) / 360),
    Math.floor((days % 360) / 20),
    days % 20,
  ].join(".");

  return {
    date,
    julianDay: jdn,
    days,
    kin,
    tone,
    toneName,
    seal,
    sealIndex,
    trecena,
    wave: `1 ${waveSeal}`,
    waveKin,
    longCount,
  };
}

/** Сумісність зі старими викликами: число життєвого шляху на поточний рік. */
export function lifePathOf(date: string, currentYear = 2026): number | null {
  return numerologyProfile(date, currentYear)?.lifePath ?? null;
}

/** Тварина року за Лічунем — тонка обгортка над повним профілем. */
export function chineseAnimalOf(date: string): string | null {
  return chineseProfile(date)?.year.animal ?? null;
}

/** День і тон Цолькіна — тонка обгортка над повним профілем. */
export function tzolkinOf(date: string): { sign: string; tone: number } | null {
  const profile = mayanProfile(date);
  return profile ? { sign: profile.seal, tone: profile.tone } : null;
}

/** Рік китайського циклу за Лічунем. */
export function chineseYearOf(date: string): number | null {
  return chineseProfile(date)?.solarYear ?? null;
}

/** Усі тварини в порядку циклу — для довідника. */
export const CHINESE_ANIMAL_NAMES: readonly string[] = CHINESE_ANIMALS;
