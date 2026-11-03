/**
 * Договори за вікно: архів сирої відповіді й добір обрізаного.
 *
 * Джерело віддає не більше `DOCUMENTS_CAP` за відповідь і мовчки ріже решту,
 * тож місяць ділиться навпіл, доки відповідь не влазить цілком. Архів пише
 * ті самі байти, що прийшли, — до розбору, а не після.
 * @module api-dev/src/services/spending/documents
 */

import { DOCUMENTS_CAP, SOURCE_PAUSE_MS, type MonthWindow, splitRange } from "./config";
import {
  type CounterpartyRow,
  type DocumentRow,
  type RawRecord,
  documentCounterparties,
  documentRow,
  num,
} from "./normalize";
import { contractsUrl, fetchJson, pause } from "./source";
import { archiveRaw } from "./store";

interface ContractsPayload {
  readonly documents?: RawRecord[];
  readonly count?: unknown;
  readonly moreThenCount?: unknown;
}

/** Місце під сирий архів у стані прогону: лічильник спільний на весь місяць. */
export interface ArchiveBudget {
  archivedBytes: number;
}

export interface ContractsResult {
  readonly documents: DocumentRow[];
  readonly parties: CounterpartyRow[];
}

/** Джерело обрізало відповідь: рядків більше, ніж влазить у `DOCUMENTS_CAP`. */
function truncated(payload: ContractsPayload, raw: readonly RawRecord[]): boolean {
  if (raw.length >= DOCUMENTS_CAP) return true;
  if (num(payload.moreThenCount) > 0) return true;
  return num(payload.count) > raw.length;
}

/** Архів лежить один на місяць; роздроблене вікно додає свої межі до назви. */
function archiveKey(edrpou: string, window: MonthWindow, from: string, to: string): string {
  const scope =
    from === window.from && to === window.to ? window.period : `${window.period}.${from}_${to}`;
  return `spending/contracts/${edrpou}/${scope}.json.gz`;
}

/** Договори за вікно; обрізане вікно добирається двома вужчими. */
export async function collectContracts(
  bucket: R2Bucket,
  budget: ArchiveBudget,
  edrpou: string,
  window: MonthWindow,
  from: string,
  to: string,
): Promise<ContractsResult> {
  const key = archiveKey(edrpou, window, from, to);
  const payload = await fetchJson<ContractsPayload>(contractsUrl(edrpou, from, to), {
    onBody: async (body) => {
      budget.archivedBytes += await archiveRaw(bucket, key, body);
    },
  });

  const raw = payload.documents ?? [];
  if (!truncated(payload, raw)) {
    return {
      documents: raw.map((item) => documentRow(item, "contract")).filter((row) => row !== null),
      parties: raw.flatMap(documentCounterparties),
    };
  }
  if (from === to) {
    throw new Error(
      `Є-data обрізало договори за ${from} (понад ${DOCUMENTS_CAP}) — повне вивантаження цього дня неможливе`,
    );
  }

  const { left, right } = splitRange(from, to);
  const parts: ContractsResult = { documents: [], parties: [] };
  for (const [start, end] of [left, right]) {
    await pause(SOURCE_PAUSE_MS);
    const part = await collectContracts(bucket, budget, edrpou, window, start, end);
    parts.documents.push(...part.documents);
    parts.parties.push(...part.parties);
  }
  return parts;
}
