/**
 * Дані демо-лендінгу `/style`: вигадані, але у формі справжніх екранів.
 *
 * **Тут лише дані.** Жодного класу, кольору чи розміру — вигляд беруть ролі з
 * `@wwwuabot/shared/ui/role-catalog`, а таблиця й картки лише розкладають
 * тексти. Саме це й доводить правило: нова сторінка = тексти + роль.
 *
 * @module web-admin-dev/src/pages/style/demo-content
 */

export interface DemoUser {
  lead: string;
  handle: string;
  telegram: string;
  role: string;
  plan: string;
  status: "Активний" | "Запрошено" | "Заблоковано" | "Чернетка";
  access: string;
  city: string;
  trackers: number;
  entries: number;
  notes: number;
  lastSeen: string;
  created: string;
}

/** 14 стовпців: більше за екран — таблиця мусить їхати вбік. */
export const USER_COLUMNS = [
  "Користувач",
  "Ім'я на платформі",
  "Telegram",
  "Роль",
  "Тариф",
  "Статус",
  "Допуск",
  "Місто",
  "Трекерів",
  "Записів",
  "Нотаток",
  "Останній вхід",
  "Створено",
  "Дії",
] as const;

/** Номери колонок, які фарбують шапку своєю серією (цикл 1…6). */
export const USER_COLUMN_TONES = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2] as const;

const NAMES = [
  "Олена Коваль",
  "Сергій Мельник",
  "Ірина Бондар",
  "Тарас Шевчук",
  "Марія Гнатюк",
  "Андрій Литвин",
  "Наталя Мороз",
  "Дмитро Савченко",
  "Юлія Романюк",
  "Богдан Кравець",
  "Софія Данилюк",
  "Максим Пилипенко",
  "Леся Гончар",
  "Олег Ткаченко",
  "Анна Кравчук",
  "Віктор Захарчук",
  "Христина Павлюк",
  "Роман Кузьменко",
  "Валерія Сидоренко",
  "Павло Лисенко",
];

const CITIES = ["Київ", "Львів", "Одеса", "Дніпро", "Харків", "Вінниця", "Тернопіль", "Ужгород"];

const ROLES = ["Власник", "Адмін", "Модератор", "Учасник", "Гість"];
const PLANS = ["Повний", "Базовий", "Пробний", "Запрошення"];
const ACCESS = ["Повний", "Читання", "Обмежений", "Немає"];

/** 60 рядків: вистачає, щоб таблиця горталась усередині й сторінка не стояла. */
export const DEMO_USERS: readonly DemoUser[] = Array.from({ length: 60 }, (_, index) => {
  const name = NAMES[index % NAMES.length];
  const day = String((index % 28) + 1).padStart(2, "0");
  const month = String((index % 12) + 1).padStart(2, "0");
  return {
    lead: name,
    handle: `palianytsia_${String(index + 1).padStart(2, "0")}`,
    telegram: `@${name.split(" ")[1].toLowerCase()}${index + 7}`,
    role: ROLES[index % ROLES.length],
    plan: PLANS[index % PLANS.length],
    status: (["Активний", "Активний", "Запрошено", "Активний", "Чернетка", "Заблоковано"] as const)[
      index % 6
    ],
    access: ACCESS[index % ACCESS.length],
    city: CITIES[index % CITIES.length],
    trackers: (index * 3) % 12,
    entries: (index * 7) % 90,
    notes: (index * 2) % 14,
    lastSeen: `${day}.${month}.2026`,
    created: `${String(((index + 4) % 28) + 1).padStart(2, "0")}.0${(index % 9) + 1}.2026`,
  };
});

/** Показники: число, підпис, серія — усе з ролей каталогу. */
export const KPI = [
  { label: "Користувачі", value: "7", note: "3 публічні профілі", series: 1 },
  { label: "Повідомлення", value: "24", note: "6 непрочитаних у 3 розмовах", series: 2 },
  { label: "Трекери", value: "70", note: "33 активні, 24 групи", series: 3 },
  { label: "Сторінки", value: "29", note: "3 публічні, 13 екранів", series: 4 },
] as const;

/** Топ груп трекерів — горизонтальні смуги. */
export const TRACKER_GROUPS = [
  { name: "Домашні справи", value: 11, fill: 100, series: 1 },
  { name: "Спорт", value: 8, fill: 70, series: 2 },
  { name: "Тіло", value: 6, fill: 60, series: 3 },
  { name: "Споживання", value: 5, fill: 50, series: 4 },
  { name: "Розвиток", value: 5, fill: 50, series: 5 },
  { name: "Інше", value: 3, fill: 30, series: 0 },
] as const;

/** Кільця: частка виконаного в трьох розділах. */
export const RINGS = [
  { label: "Замовлення", value: "3 із 7", percent: 45, series: 3 },
  { label: "Розвиток", value: "28 тестів", percent: 62, series: 1 },
  { label: "Сторінки", value: "13 екранів", percent: 80, series: 4 },
] as const;

/** Легенда графіка: колір серії = колір підпису. */
export const LEGEND = [
  { label: "Створені", series: 1 },
  { label: "Активні", series: 2 },
  { label: "Запрошені", series: 3 },
  { label: "Архів", series: 0 },
] as const;
