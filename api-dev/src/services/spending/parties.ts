/**
 * Каталог контрагентів: джерело тримає їх лише всередині договорів і платежів.
 *
 * Довідника контрагентів в API немає (docs/SPENDING.md §2), тож каталог
 * будується з того, що прийшло: код, назва, а з договору — ще й місто з
 * областю. `HIDDEN` — ознака приховування, а не код, тому в каталог не йде.
 * @module api-dev/src/services/spending/parties
 */

import type { CounterpartyRow } from "./normalize";
import { upsertCounterparties } from "./upserts";

/** Дублі в межах прогону: один ЄДРПОУ — один рядок, найповніший із зустрінутих. */
export function mergeCounterparties(rows: readonly CounterpartyRow[]): CounterpartyRow[] {
  const byCode = new Map<string, CounterpartyRow>();
  for (const row of rows) {
    const seen = byCode.get(row.edrpou);
    byCode.set(row.edrpou, {
      edrpou: row.edrpou,
      name: row.name || seen?.name || "",
      city: row.city || seen?.city || "",
      region: row.region || seen?.region || "",
    });
  }
  return [...byCode.values()];
}

/** Запис каталогу пачками: тисяча платежів дає сотні контрагентів, не тисячі. */
export async function saveCounterparties(
  db: D1Database,
  rows: readonly CounterpartyRow[],
): Promise<number> {
  const unique = mergeCounterparties(rows);
  if (unique.length > 0) await upsertCounterparties(db, unique);
  return unique.length;
}
