/**
 * Досьє за датою: дата → знак Сонця → свідчення лінзи. Сервер віддає
 * свідчення, а рівні й показ вирішує клієнт. Подія не отримує рис людини —
 * це сказано полем `note`, а не порожнім набором.
 *
 * @module api-dev/src/services/quality-dossier.service
 */

import type { SubjectKind } from "@wwwuabot/shared/content";
import { westernClaims, type QualityClaim } from "@wwwuabot/shared/qualities";
import { SYSTEM_CALCULATORS } from "../shared/mydate-helpers";

/** Досьє одного суб'єкта: дата, вид, символ і свідчення. */
export interface DossierRead {
  readonly date: string;
  readonly kind: SubjectKind;
  readonly symbol: string | null;
  readonly claims: readonly QualityClaim[];
  /** Чому якостей немає; `null` — профіль людини порахований. */
  readonly note: "event-not-modelled" | "symbol-missing" | null;
}

/** Знак Сонця з того самого калькулятора, що й таблиця: друга формула — друга правда. */
export function sunSignOf(date: string): string | null {
  const result = SYSTEM_CALCULATORS.western(date);
  const param = result.parameters?.find((one) => one.key === "sunSign");
  return typeof param?.value === "string" && param.value ? param.value : null;
}

/** Досьє одного суб'єкта. */
export function buildDossier(date: string, kind: SubjectKind): DossierRead {
  const symbol = sunSignOf(date);
  if (kind === "event") {
    return { date, kind, symbol, claims: [], note: "event-not-modelled" };
  }
  return {
    date,
    kind,
    symbol,
    claims: symbol ? westernClaims(symbol) : [],
    note: symbol ? null : "symbol-missing",
  };
}
