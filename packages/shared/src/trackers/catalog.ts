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
  /** Тематика в стрічці: мірки одного сенсу стоять під одним заголовком. */
  group: TrackerGroup;
}

/** Стеля вводу: межа числа, довжини тексту й кількості трекерів у людини. */
export const TRACKER_LIMITS = {
  title: 40,
  unit: 8,
  note: 200,
  trackers: 60,
  value: 1_000_000_000,
} as const;

/** Тематики стрічки — у такому порядку йдуть заголовки груп. */
export const TRACKER_GROUPS = ["Активність", "Самопочуття", "Режим", "Розвиток", "Гроші"] as const;
export type TrackerGroup = (typeof TRACKER_GROUPS)[number];

/** Група власних трекерів: усе, чого немає в каталозі, — під одним дахом. */
export const TRACKER_OWN_GROUP = "Свої";

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
    group: "Активність",
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
    group: "Режим",
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
    group: "Режим",
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
    group: "Самопочуття",
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
    group: "Самопочуття",
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
    group: "Самопочуття",
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
    group: "Активність",
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
    group: "Розвиток",
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
    group: "Гроші",
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
    group: "Самопочуття",
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
    group: "Самопочуття",
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
    group: "Режим",
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
    group: "Активність",
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
    group: "Активність",
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
    group: "Самопочуття",
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
    group: "Самопочуття",
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
    group: "Самопочуття",
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
    group: "Режим",
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
    group: "Режим",
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
    group: "Режим",
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
    group: "Режим",
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
    group: "Режим",
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
    group: "Режим",
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
    group: "Розвиток",
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
    group: "Розвиток",
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
    group: "Розвиток",
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
    group: "Розвиток",
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
    group: "Гроші",
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
    group: "Гроші",
  },
];

const CATALOG_BY_KEY = new Map(TRACKER_CATALOG.map((entry) => [entry.key, entry]));

/** Запис каталогу за ключем: `undefined` — це власний трекер людини. */
export function catalogEntry(key: string): TrackerCatalogEntry | undefined {
  return CATALOG_BY_KEY.get(key);
}

/** Тематика мірки: з каталогу за ключем; свій трекер — завжди «Свої». */
export function trackerGroup(tracker: { key: string }): string {
  return catalogEntry(tracker.key)?.group ?? TRACKER_OWN_GROUP;
}
