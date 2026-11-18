/**
 * Рядки таблиці демо: числа й звʼязки, без слів.
 *
 * Слова живуть у `demo.json` (гейт `check:texts`), тут — лише те, що
 * генерується: 60 рядків, номери, дати. Так само зробить справжня сторінка:
 * тексти з бази, числа з даних.
 *
 * @module web-admin-dev/src/pages/style/demo-content
 */

import demo from "./demo.json";

export interface DemoUser {
  lead: string;
  handle: string;
  telegram: string;
  role: string;
  plan: string;
  status: string;
  statusTone: string;
  access: string;
  city: string;
  trackers: number;
  entries: number;
  notes: number;
  lastSeen: string;
  created: string;
}

const pad = (value: number): string => String(value).padStart(2, "0");

/** 60 рядків: вистачає, щоб таблиця горталась усередині. */
export const DEMO_USERS: readonly DemoUser[] = Array.from({ length: 60 }, (_, index) => {
  const table = demo.table;
  const name = table.names[index % table.names.length];
  const status = table.statuses[index % table.statuses.length];
  return {
    lead: name,
    handle: `palianytsia_${pad(index + 1)}`,
    telegram: `@${name.split(" ")[1].toLowerCase()}${index + 7}`,
    role: table.roles[index % table.roles.length],
    plan: table.plans[index % table.plans.length],
    status: status.label,
    statusTone: status.tone,
    access: table.access[index % table.access.length],
    city: table.cities[index % table.cities.length],
    trackers: (index * 3) % 12,
    entries: (index * 7) % 90,
    notes: (index * 2) % 14,
    lastSeen: `${pad((index % 28) + 1)}.${pad((index % 12) + 1)}.2026`,
    created: `${pad(((index + 4) % 28) + 1)}.0${(index % 9) + 1}.2026`,
  };
});

/** Номери серій для циклів у шапці таблиці. */
export const COLUMN_TONES = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2] as const;
