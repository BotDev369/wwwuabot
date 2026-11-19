/**
 * Довгота Сонця на 12:00 UTC (Meeus, розд. 25, похибка ≈0.01°) і все, що з неї
 * виводиться. Без часу народження Сонце проходить ≈59′ за добу — тому знак,
 * декан, межа й двадашамша перевіряються на 00:00 і 24:00, і зміна за добу
 * потрапляє в `ambiguous`, а не ховається.
 *
 * @module api-dev/src/shared/western-calculator
 */

import type { WesternProfile } from "@wwwuabot/shared/qualities";

const RAD = Math.PI / 180;

const SIGNS = [
  "Овен",
  "Телець",
  "Близнюки",
  "Рак",
  "Лев",
  "Діва",
  "Терези",
  "Скорпіон",
  "Стрілець",
  "Козоріг",
  "Водолій",
  "Риби",
] as const;

/** Родовий відмінок для підпису градуса: «12°58′ Риб», а не «12°58′ Риби». */
const GENITIVE = [
  "Овна",
  "Тельця",
  "Близнюків",
  "Рака",
  "Лева",
  "Діви",
  "Терезів",
  "Скорпіона",
  "Стрільця",
  "Козорога",
  "Водолія",
  "Риб",
] as const;

const ELEMENTS = ["Вогонь", "Земля", "Повітря", "Вода"] as const;
const MODALITIES = ["Кардинальний", "Фіксований", "Мутабельний"] as const;

const MODERN_RULERS = [
  "Марс",
  "Венера",
  "Меркурій",
  "Місяць",
  "Сонце",
  "Меркурій",
  "Венера",
  "Плутон",
  "Юпітер",
  "Сатурн",
  "Уран",
  "Нептун",
] as const;

const TRADITIONAL_RULERS = [
  "Марс",
  "Венера",
  "Меркурій",
  "Місяць",
  "Сонце",
  "Меркурій",
  "Венера",
  "Марс",
  "Юпітер",
  "Сатурн",
  "Сатурн",
  "Юпітер",
] as const;

/** Декани: халдейський порядок, три по 10° у кожному знаку. */
const DECAN_RULERS: readonly (readonly [string, string, string])[] = [
  ["Марс", "Сонце", "Венера"],
  ["Меркурій", "Місяць", "Сатурн"],
  ["Юпітер", "Марс", "Сонце"],
  ["Венера", "Меркурій", "Місяць"],
  ["Сатурн", "Юпітер", "Марс"],
  ["Сонце", "Венера", "Меркурій"],
  ["Місяць", "Сатурн", "Юпітер"],
  ["Марс", "Сонце", "Венера"],
  ["Меркурій", "Місяць", "Сатурн"],
  ["Юпітер", "Марс", "Сонце"],
  ["Венера", "Меркурій", "Місяць"],
  ["Сатурн", "Юпітер", "Марс"],
];

/** Єгипетські межі (терми): верхня межа відрізка в градусах і управитель. */
const EGYPTIAN_BOUNDS: readonly (readonly (readonly [number, string])[])[] = [
  [
    [6, "Юпітер"],
    [12, "Венера"],
    [20, "Меркурій"],
    [25, "Марс"],
    [30, "Сатурн"],
  ],
  [
    [8, "Венера"],
    [14, "Меркурій"],
    [22, "Юпітер"],
    [27, "Сатурн"],
    [30, "Марс"],
  ],
  [
    [6, "Меркурій"],
    [12, "Юпітер"],
    [17, "Венера"],
    [24, "Марс"],
    [30, "Сатурн"],
  ],
  [
    [7, "Марс"],
    [13, "Венера"],
    [19, "Меркурій"],
    [26, "Юпітер"],
    [30, "Сатурн"],
  ],
  [
    [6, "Юпітер"],
    [11, "Венера"],
    [18, "Сатурн"],
    [24, "Меркурій"],
    [30, "Марс"],
  ],
  [
    [7, "Меркурій"],
    [17, "Венера"],
    [21, "Юпітер"],
    [28, "Марс"],
    [30, "Сатурн"],
  ],
  [
    [6, "Сатурн"],
    [14, "Меркурій"],
    [21, "Юпітер"],
    [28, "Венера"],
    [30, "Марс"],
  ],
  [
    [7, "Марс"],
    [11, "Венера"],
    [19, "Меркурій"],
    [24, "Юпітер"],
    [30, "Сатурн"],
  ],
  [
    [12, "Юпітер"],
    [17, "Венера"],
    [21, "Меркурій"],
    [26, "Сатурн"],
    [30, "Марс"],
  ],
  [
    [7, "Меркурій"],
    [14, "Юпітер"],
    [22, "Венера"],
    [26, "Сатурн"],
    [30, "Марс"],
  ],
  [
    [7, "Меркурій"],
    [13, "Венера"],
    [20, "Юпітер"],
    [25, "Марс"],
    [30, "Сатурн"],
  ],
  [
    [12, "Венера"],
    [16, "Юпітер"],
    [19, "Меркурій"],
    [28, "Марс"],
    [30, "Сатурн"],
  ],
];

/** Юліанська дата для 0h UT плюс години — за Грегоріанським календарем. */
function julianDay(year: number, month: number, day: number, hours: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  return jdn - 0.5 + hours / 24;
}

/** Довгота Сонця в градусах, 0…360, за Meeus (низька точність). */
export function sunLongitude(date: string, hours = 12): number {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) throw new Error(`Дата «${date}» не читається.`);
  const n = julianDay(year, month, day, hours) - 2451545.0;
  const mean = (280.46646 + 0.9856474 * n) % 360;
  const anomaly = (357.52911 + 0.98560028 * n) % 360;
  const lambda = mean + 1.915 * Math.sin(anomaly * RAD) + 0.02 * Math.sin(2 * anomaly * RAD);
  return ((lambda % 360) + 360) % 360;
}

function formatDegree(degree: number): string {
  const whole = Math.floor(degree);
  const minutes = Math.round((degree - whole) * 60);
  return minutes === 60 ? `${whole + 1}°00′` : `${whole}°${String(minutes).padStart(2, "0")}′`;
}

interface Position {
  readonly signIndex: number;
  readonly degree: number;
  readonly decan: 1 | 2 | 3;
  readonly bound: { readonly label: string; readonly ruler: string };
  readonly dwadIndex: number;
}

function positionOf(longitude: number): Position {
  const signIndex = Math.floor(longitude / 30) % 12;
  const degree = longitude - signIndex * 30;
  const decan = (Math.min(2, Math.floor(degree / 10)) + 1) as 1 | 2 | 3;
  const bounds = EGYPTIAN_BOUNDS[signIndex] ?? [];
  let start = 0;
  let found = bounds[bounds.length - 1];
  for (const entry of bounds) {
    if (degree < entry[0]) {
      found = entry;
      break;
    }
    start = entry[0];
  }
  const limit = found?.[0] ?? 30;
  const ruler = found?.[1] ?? "Сатурн";
  return {
    signIndex,
    degree,
    decan,
    bound: { label: `${ruler}, ${start}°–${limit}°`, ruler },
    dwadIndex: Math.min(11, Math.floor(degree / 2.5)),
  };
}

/**
 * Канонічний профіль Сонця. `ambiguous` перелічує тільки ті показники, які
 * справді змінюються за добу — без нього «точний градус» був би вигадкою.
 */
export function westernProfile(date: string): WesternProfile {
  const noon = sunLongitude(date, 12);
  const start = positionOf(sunLongitude(date, 0));
  const end = positionOf(sunLongitude(date, 24));
  const position = positionOf(noon);
  const sign = SIGNS[position.signIndex] ?? "Овен";

  const ambiguous: string[] = [];
  if (start.signIndex !== end.signIndex) {
    ambiguous.push(`знак: ${SIGNS[start.signIndex]} → ${SIGNS[end.signIndex]}`);
  }
  if (start.decan !== end.decan) ambiguous.push(`декан: ${start.decan}-й → ${end.decan}-й`);
  if (start.bound.ruler !== end.bound.ruler) {
    ambiguous.push(`межа: ${start.bound.ruler} → ${end.bound.ruler}`);
  }
  if (start.dwadIndex !== end.dwadIndex) {
    ambiguous.push(
      `двадашамша: ${SIGNS[(start.signIndex + start.dwadIndex) % 12]} → ${SIGNS[(end.signIndex + end.dwadIndex) % 12]}`,
    );
  }

  const degreeLabel = formatDegree(position.degree);
  return {
    date,
    sign,
    degree: position.degree,
    degreeLabel,
    sunLabel: `${degreeLabel} ${GENITIVE[position.signIndex] ?? sign}`,
    at: "12:00 UTC",
    decan: position.decan,
    decanRuler: DECAN_RULERS[position.signIndex]?.[position.decan - 1] ?? "Сатурн",
    boundLabel: position.bound.label,
    boundRuler: position.bound.ruler,
    dwad: SIGNS[(position.signIndex + position.dwadIndex) % 12] ?? sign,
    element: ELEMENTS[position.signIndex % 4] ?? "Вода",
    modality: MODALITIES[position.signIndex % 3] ?? "Мутабельний",
    polarity: position.signIndex % 2 === 0 ? "Ян" : "Їнь",
    ruler: MODERN_RULERS[position.signIndex] ?? "Нептун",
    traditionalRuler: TRADITIONAL_RULERS[position.signIndex] ?? "Юпітер",
    ambiguous,
  };
}
