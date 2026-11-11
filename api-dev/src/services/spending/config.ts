/**
 * Сталі колектора Є-data: адреса джерела, набір ЄДРПОУ, вікно й розбиття.
 *
 * Набір — Бучанська громада, звірений із довідником джерела, а не з реєстрів
 * (docs/SPENDING.md §8). Вікно місяця й стеля масиву платників — контракт
 * джерела (§2), а не смак.
 * @module api-dev/src/services/spending/config
 */

/** Повна адреса джерела: шляхи з §2 документа рахуються відносно неї. */
export const SPENDING_BASE_URL = "https://api.spending.gov.ua/api/v2";

/** Стеля масиву `payers_edrpous`: 11 кодів уже дають 400. */
export const MAX_PAYERS_PER_REQUEST = 10;

/** Пауза між запитами: паралельність тут дає 503, а не швидкість. */
export const SOURCE_PAUSE_MS = 400;

/**
 * Бучанська громада. Порядок — за роллю в бюджеті: органи, комунальні
 * організації, підприємства, медицина.
 */
export const SEED_ORGS = [
  "04360586",
  "43907812",
  "34357364",
  "34357702",
  "42225911",
  "26473919",
  "42538580",
  "25689882",
  "33699425",
  "41141202",
  "44908597",
  "42081684",
] as const;

/** Гарячі картки живуть добу: далі їх перезбирає наступний прогін. */
export const CARD_TTL_SECONDS = 86_400;

/** Зібране молодше за добу не перечитуємо: інакше два прогони поспіль роблять ту саму роботу. */
export const REFRESH_AFTER_MS = 20 * 60 * 60 * 1000;

/** Стеля прогону: ручний перезбір іде через HTTP, а 9 хвилин лишають запас на запис. */
export const RUN_BUDGET_MS = 9 * 60 * 1000;

/** Кількість збоїв поспіль, після якої прогін зупиняється: це «джерело лежить». */
export const MAX_CONSECUTIVE_FAILURES = 3;

/** Стеля договорів за відповідь: ширше джерело не віддає (§2). */
export const DOCUMENTS_CAP = 1000;

/** Ключ, під яким лежить дата останнього завантаження джерела. */
export const LASTLOAD_KEY = "spending:meta:lastload:v1";

/** Ключ меж даних (`range.ts`): їх оновлює синк, а не кожне відкриття екрана. */
export const DATA_RANGE_KEY = "spending:meta:range:v1";

/** Ключ картки розпорядника в `CONTENT_KV`. */
export function cardKey(edrpou: string): string {
  return `spending:org:${edrpou}:v1`;
}

export interface MonthWindow {
  readonly period: string;
  readonly from: string;
  readonly to: string;
}

/** `2026-09` → перше й останнє число місяця у форматі, який приймає джерело. */
export function monthWindow(period: string): MonthWindow {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) throw new Error(`Період має бути YYYY-MM, а не «${period}».`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error(`Місяця «${month}» не існує.`);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { period, from: `${period}-01`, to: `${period}-${String(lastDay).padStart(2, "0")}` };
}

/**
 * Ключ пачки платежів: підпис із складених ЄДРПОУ, а не позиція в списку.
 *
 * Позиційний ключ (`batch-1`) ламається від будь-якої зміни набору: доданий
 * код зсуває пачки, а старий `ok` назавжди ховає його платежі (§9).
 */
export function batchKey(period: string, codes: readonly string[]): string {
  return `transactions:${period}:${signature(codes)}`;
}

/** Ключ пачки надходжень: той самий набір, але інший бік платежу. */
export function receiptsKey(period: string, codes: readonly string[]): string {
  return `recipts:${period}:${signature(codes)}`;
}

/** Довідник областей — один крок на прогін, не на період. */
export const REGIONS_SYNC_KEY = "ref:regions";

/** FNV-1a: короткий стабільний підпис, який не залежить від порядку кодів. */
function signature(codes: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const char of [...codes].sort().join(",")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Ділить вікно навпіл: обрізану відповідь добираємо двома вужчими. */
export function splitRange(
  from: string,
  to: string,
): { left: [string, string]; right: [string, string] } {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new Error(`Вікно «${from}…${to}» не ділиться.`);
  }
  const days = Math.round((end - start) / 86_400_000);
  const middle = start + Math.floor(days / 2) * 86_400_000;
  const left: [string, string] = [from, isoDay(middle)];
  const right: [string, string] = [isoDay(middle + 86_400_000), to];
  return { left, right };
}

function isoDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Ріже список на частини не довші за `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new Error("Розмір частини мусить бути додатним.");
  const parts: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    parts.push(items.slice(index, index + size));
  }
  return parts;
}
