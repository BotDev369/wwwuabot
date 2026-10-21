/**
 * Каталог стандартних трекерів: перелік мірок першого входу, їхні тематики
 * й межі вводу. Це **дані, а не механіка**: дні, валідація й читання записів
 * живуть у `../trackers.ts` — публічній поверхні, яка цей модуль реекспортує.
 * Правила — в `docs/TRACKERS.md`.
 *
 * @module @wwwuabot/shared/trackers/catalog
 */

import type { IconName } from "../components/icon-names";
import type { TrackerFields } from "../trackers";

/** Рядок каталогу: стандартний трекер — приклад одного механізму, а не новий вид. */
export interface TrackerCatalogEntry extends TrackerFields {
  key: string;
  icon: IconName;
  /** Тематика в стрічці: ключ групи каталогу, рядок якої сіє сервер. */
  groupKey: TrackerCatalogGroupKey;
}

/** Стеля вводу: межа числа, довжини тексту й кількості трекерів у людини. */
export const TRACKER_LIMITS = {
  title: 40,
  unit: 8,
  note: 200,
  trackers: 60,
  value: 1_000_000_000,
} as const;

/**
 * Тематики стрічки — **дані, а не механіка**: рядок каталогу сіє сервер у
 * `tracker_groups` ключем, а людина може перейменувати його й наділити
 * підгрупами, як власну групу. Порядок ключів — порядок заголовків.
 */
export const TRACKER_CATALOG_GROUPS = [
  { key: "activity", title: "Активність" },
  { key: "wellbeing", title: "Самопочуття" },
  { key: "routine", title: "Режим" },
  { key: "growth", title: "Розвиток" },
  { key: "money", title: "Гроші" },
  // «Свої» — системний корінь для всього, що людина не віднесла сама; він
  // останній у списку, бо його ніхто не обирає — він завжди є.
  { key: "own", title: "Свої" },
] as const;

export type TrackerCatalogGroupKey = (typeof TRACKER_CATALOG_GROUPS)[number]["key"];

/** Системна група «Свої»: її рядок сіє сервер, видалити її не можна. */
export const TRACKER_OWN_GROUP_KEY = "own";

/**
 * Стандартний набір — те, що людина бачить при першому вході.
 *
 * Це приклади одного механізму, а не закритий перелік: власний трекер
 * додають тим самим полем «назва + одиниця + ціль» (див. `docs/TRACKERS.md`).
 */
export const TRACKER_CATALOG: readonly TrackerCatalogEntry[] = [
  {
    key: "steps",
    title: "Кроки",
    unit: "кроків",
    step: 500,
    goal: 8000,
    min: 0,
    max: 100000,
    icon: "footsteps",
    mode: "sum",
    groupKey: "activity",
  },
  {
    key: "water",
    title: "Вода",
    unit: "л",
    step: 0.25,
    goal: 2,
    min: 0,
    max: 20,
    icon: "droplet",
    mode: "sum",
    groupKey: "routine",
  },
  {
    key: "sleep",
    title: "Сон",
    unit: "год",
    step: 0.5,
    goal: 8,
    min: 0,
    max: 24,
    icon: "moon",
    mode: "read",
    groupKey: "routine",
  },
  {
    key: "weight",
    title: "Вага",
    unit: "кг",
    step: 0.1,
    goal: null,
    min: 0,
    max: 500,
    icon: "progress",
    mode: "read",
    groupKey: "wellbeing",
  },
  {
    key: "mood",
    title: "Настрій",
    unit: "бал",
    step: 1,
    goal: 4,
    min: 1,
    max: 5,
    icon: "heart",
    mode: "read",
    groupKey: "wellbeing",
  },
  {
    key: "energy",
    title: "Енергія",
    unit: "бал",
    step: 1,
    goal: 4,
    min: 1,
    max: 5,
    icon: "sun",
    mode: "read",
    groupKey: "wellbeing",
  },
  {
    key: "workout",
    title: "Рух",
    unit: "хв",
    step: 5,
    goal: 30,
    min: 0,
    max: 600,
    icon: "flame",
    mode: "sum",
    groupKey: "activity",
  },
  {
    key: "reading",
    title: "Читання",
    unit: "хв",
    step: 5,
    goal: 20,
    min: 0,
    max: 600,
    icon: "book",
    mode: "sum",
    groupKey: "growth",
  },
  {
    key: "spend",
    title: "Витрати",
    unit: "₴",
    step: 10,
    goal: null,
    min: 0,
    max: TRACKER_LIMITS.value,
    icon: "wallet",
    mode: "sum",
    groupKey: "money",
  },
  {
    key: "temp",
    title: "Температура",
    unit: "°",
    step: 0.1,
    goal: null,
    min: 30,
    max: 45,
    icon: "thermometer",
    mode: "read",
    groupKey: "wellbeing",
  },
  {
    key: "protein",
    title: "Білок",
    unit: "г",
    step: 5,
    goal: 90,
    min: 0,
    max: 500,
    icon: "hash",
    mode: "sum",
    groupKey: "wellbeing",
  },
  {
    key: "calm",
    title: "Медитація",
    unit: "хв",
    step: 5,
    goal: 10,
    min: 0,
    max: 600,
    icon: "lotus",
    mode: "sum",
    groupKey: "routine",
  },
  {
    key: "run",
    title: "Біг",
    unit: "км",
    step: 1,
    goal: 3,
    min: 0,
    max: 200,
    icon: "run",
    mode: "sum",
    groupKey: "activity",
  },
  {
    key: "bike",
    title: "Велосипед",
    unit: "км",
    step: 1,
    goal: 5,
    min: 0,
    max: 300,
    icon: "bike",
    mode: "sum",
    groupKey: "activity",
  },
  {
    key: "pressure",
    title: "Тиск",
    unit: "мм рт",
    step: 5,
    goal: null,
    min: 50,
    max: 250,
    icon: "pulse",
    mode: "read",
    groupKey: "wellbeing",
  },
  {
    key: "glucose",
    title: "Цукор",
    unit: "ммоль/л",
    step: 0.1,
    goal: null,
    min: 1,
    max: 35,
    icon: "flask",
    mode: "read",
    groupKey: "wellbeing",
  },
  {
    key: "calories",
    title: "Калорії",
    unit: "ккал",
    step: 50,
    goal: 2000,
    min: 0,
    max: 10000,
    icon: "plate",
    mode: "sum",
    groupKey: "wellbeing",
  },
  {
    key: "coffee",
    title: "Кава",
    unit: "чашки",
    step: 1,
    goal: 3,
    min: 0,
    max: 15,
    icon: "cup",
    mode: "sum",
    groupKey: "routine",
  },
  {
    key: "screen",
    title: "Екранний час",
    unit: "хв",
    step: 15,
    goal: 120,
    min: 0,
    max: 1440,
    icon: "mobile",
    mode: "sum",
    groupKey: "routine",
  },
  {
    key: "smoke",
    title: "Сигарети",
    unit: "шт",
    step: 1,
    goal: null,
    min: 0,
    max: 100,
    icon: "cigarette",
    mode: "sum",
    groupKey: "routine",
  },
  {
    key: "alcohol",
    title: "Алкоголь",
    unit: "порції",
    step: 1,
    goal: null,
    min: 0,
    max: 20,
    icon: "glass",
    mode: "sum",
    groupKey: "routine",
  },
  {
    key: "medicine",
    title: "Ліки",
    unit: "рази",
    step: 1,
    goal: 1,
    min: 0,
    max: 10,
    icon: "pill",
    mode: "sum",
    groupKey: "routine",
  },
  {
    key: "chores",
    title: "Прибирання",
    unit: "хв",
    step: 5,
    goal: 15,
    min: 0,
    max: 600,
    icon: "checklist",
    mode: "sum",
    groupKey: "routine",
  },
  {
    key: "study",
    title: "Навчання",
    unit: "хв",
    step: 10,
    goal: 30,
    min: 0,
    max: 1440,
    icon: "cap",
    mode: "sum",
    groupKey: "growth",
  },
  {
    key: "language",
    title: "Мова",
    unit: "хв",
    step: 5,
    goal: 15,
    min: 0,
    max: 720,
    icon: "globe",
    mode: "sum",
    groupKey: "growth",
  },
  {
    key: "journal",
    title: "Щоденник",
    unit: "записів",
    step: 1,
    goal: 1,
    min: 0,
    max: 10,
    icon: "message-square",
    mode: "sum",
    groupKey: "growth",
  },
  {
    key: "gratitude",
    title: "Вдячність",
    unit: "записів",
    step: 1,
    goal: 1,
    min: 0,
    max: 10,
    icon: "star",
    mode: "sum",
    groupKey: "growth",
  },
  {
    key: "saving",
    title: "Накопичення",
    unit: "₴",
    step: 50,
    goal: null,
    min: 0,
    max: TRACKER_LIMITS.value,
    icon: "jar",
    mode: "sum",
    groupKey: "money",
  },
  {
    key: "income",
    title: "Дохід",
    unit: "₴",
    step: 100,
    goal: null,
    min: 0,
    max: TRACKER_LIMITS.value,
    icon: "hryvnia",
    mode: "sum",
    groupKey: "money",
  },
];

const CATALOG_BY_KEY = new Map(TRACKER_CATALOG.map((entry) => [entry.key, entry]));

/**
 * Запис каталогу за ключем: `undefined` — це власний трекер людини.
 *
 * Тематика тепер не виводиться з каталогу — вона живе в рядку
 * `tracker_groups` власника (див. `./groups`), бо людина може її
 * перейменувати й наділити підгрупами.
 */
export function catalogEntry(key: string): TrackerCatalogEntry | undefined {
  return CATALOG_BY_KEY.get(key);
}
