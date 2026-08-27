// ── VALID_TYPES ──────────────────────────────────────────────────────
/** Allowed values for the `type` field in MyDates entries. */
export const VALID_TYPES = ["person", "event", "other"] as const;

// ── BASE_CONFIG ─────────────────────────────────────────────────────
/** Default Base 1.0 page config served when no matching scenario is found. */
export const BASE_CONFIG = {
  v: 1,
  meta: { title: "WWWUABot — Головна" },
  layout: {
    slots: ["header", "sidebar", "main", "footer"],
  },
  slots: {
    main: [
      { component: "Heading", props: { text: "Вітаємо на веб-платформі WWWUABot!" } },
      { component: "Button", props: { label: "Перейти на головну", href: "/" } },
    ],
  },
};

// ── ASTROLOGY DATA ──────────────────────────────────────────────────
/** Zodiac sign names in calendar order. */
export const SIGN_ORDER = [
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
];

/** Month*100+day cutoffs — when the sun enters each sign. */
export const SIGN_CUTOFFS: Array<{ md: number; sign: string }> = [
  { md: 119, sign: "Козоріг" },
  { md: 218, sign: "Водолій" },
  { md: 320, sign: "Риби" },
  { md: 419, sign: "Овен" },
  { md: 520, sign: "Телець" },
  { md: 620, sign: "Близнюки" },
  { md: 722, sign: "Рак" },
  { md: 822, sign: "Лев" },
  { md: 922, sign: "Діва" },
  { md: 1022, sign: "Терези" },
  { md: 1121, sign: "Скорпіон" },
  { md: 1221, sign: "Стрілець" },
  { md: 1231, sign: "Козоріг" },
];

/** Metadata for each zodiac sign: element, modality, ruler, start date. */
export const SIGN_META: Record<
  string,
  {
    element: string;
    modality: string;
    ruler: string;
    traditionalRuler: string;
    startMonth: number;
    startDay: number;
  }
> = {
  Овен: {
    element: "Вогонь",
    modality: "Кардинальний",
    ruler: "Марс",
    traditionalRuler: "Марс",
    startMonth: 3,
    startDay: 21,
  },
  Телець: {
    element: "Земля",
    modality: "Фіксований",
    ruler: "Венера",
    traditionalRuler: "Венера",
    startMonth: 4,
    startDay: 20,
  },
  Близнюки: {
    element: "Повітря",
    modality: "Мутабельний",
    ruler: "Меркурій",
    traditionalRuler: "Меркурій",
    startMonth: 5,
    startDay: 21,
  },
  Рак: {
    element: "Вода",
    modality: "Кардинальний",
    ruler: "Місяць",
    traditionalRuler: "Місяць",
    startMonth: 6,
    startDay: 21,
  },
  Лев: {
    element: "Вогонь",
    modality: "Фіксований",
    ruler: "Сонце",
    traditionalRuler: "Сонце",
    startMonth: 7,
    startDay: 23,
  },
  Діва: {
    element: "Земля",
    modality: "Мутабельний",
    ruler: "Меркурій",
    traditionalRuler: "Меркурій",
    startMonth: 8,
    startDay: 23,
  },
  Терези: {
    element: "Повітря",
    modality: "Кардинальний",
    ruler: "Венера",
    traditionalRuler: "Венера",
    startMonth: 9,
    startDay: 23,
  },
  Скорпіон: {
    element: "Вода",
    modality: "Фіксований",
    ruler: "Плутон",
    traditionalRuler: "Марс",
    startMonth: 10,
    startDay: 23,
  },
  Стрілець: {
    element: "Вогонь",
    modality: "Мутабельний",
    ruler: "Юпітер",
    traditionalRuler: "Юпітер",
    startMonth: 11,
    startDay: 22,
  },
  Козоріг: {
    element: "Земля",
    modality: "Кардинальний",
    ruler: "Сатурн",
    traditionalRuler: "Сатурн",
    startMonth: 12,
    startDay: 22,
  },
  Водолій: {
    element: "Повітря",
    modality: "Фіксований",
    ruler: "Уран",
    traditionalRuler: "Сатурн",
    startMonth: 1,
    startDay: 20,
  },
  Риби: {
    element: "Вода",
    modality: "Мутабельний",
    ruler: "Нептун",
    traditionalRuler: "Юпітер",
    startMonth: 2,
    startDay: 19,
  },
};

/** Default systems registry for the MyDate feature. */
export const DEFAULT_MYDATE_SYSTEMS: Array<{
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  parameters: Array<{ key: string; label: string }>;
}> = [
  {
    id: "western",
    name: "Західна астрологія",
    description: "Параметри на основі положення Сонця в зодіакальному колі.",
    implemented: true,
    parameters: [
      { key: "sunSign", label: "Знак Сонця" },
      { key: "element", label: "Стихія" },
      { key: "modality", label: "Якість (хрест)" },
      { key: "ruler", label: "Управитель (сучасний)" },
      { key: "traditionalRuler", label: "Традиційний управитель" },
      { key: "decan", label: "Декан" },
      { key: "degree", label: "Наближений градус Сонця" },
      { key: "cusp", label: "Прикордонний знак" },
    ],
  },
];
