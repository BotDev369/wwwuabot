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

/** Окремий розклад: не той, що знімає зріз моніторингу (`17 4 * * *`). */
export const SPENDING_CRON = "37 5 * * *";

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

/** Ключ, під яким лежить дата останнього завантаження джерела. */
export const LASTLOAD_KEY = "spending:meta:lastload:v1";

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

/** Місяць, що передує `now`: збір за розкладом бере саме його. */
export function previousMonthPeriod(now: Date): string {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}`;
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
