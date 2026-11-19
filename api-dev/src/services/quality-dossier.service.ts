/**
 * Досьє за датою: дата + вибрані лінзи → свідчення. Сервер не добирає
 * системи сам: без явного вибору людини досьє не існує. Подія не отримує рис
 * людини — це сказано полем `note`, а не порожнім набором.
 *
 * @module api-dev/src/services/quality-dossier.service
 */

import type { SubjectKind } from "@wwwuabot/shared/content";
import {
  chineseClaims,
  mayanClaims,
  numerologyClaims,
  westernClaims,
  type QualityClaim,
} from "@wwwuabot/shared/qualities";
import { SYSTEM_CALCULATORS } from "../shared/mydate-helpers";
import { chineseAnimalOf, lifePathOf, tzolkinOf } from "../shared/date-lens-calculators";

/** Досьє одного суб'єкта: дата, вид, символ і свідчення вибраних лінз. */
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

/** Кожна лінза сама вирішує, чи її правило дає вихід для цієї дати. */
const BUILDERS: Readonly<Record<string, (date: string) => readonly QualityClaim[]>> = {
  western: (date) => {
    const sign = sunSignOf(date);
    return sign ? westernClaims(sign) : [];
  },
  numerology: (date) => {
    const lifePath = lifePathOf(date);
    return lifePath === null ? [] : numerologyClaims(lifePath);
  },
  chinese: (date) => {
    const animal = chineseAnimalOf(date);
    return animal ? chineseClaims(animal) : [];
  },
  mayan: (date) => {
    const day = tzolkinOf(date);
    return day ? mayanClaims(day.sign, day.tone) : [];
  },
};

/**
 * Досьє одного суб'єкта за вибраними лінзами. Порожній або невідомий вибір —
 * помилка виклику, а не привід тихо порахувати «щось».
 */
export function buildDossier(
  date: string,
  kind: SubjectKind,
  lenses: readonly string[],
): DossierRead {
  const symbol = sunSignOf(date);
  if (kind === "event") {
    return { date, kind, symbol, claims: [], note: "event-not-modelled" };
  }
  const claims = lenses.flatMap((id) => {
    const build = BUILDERS[id];
    if (!build) throw new Error(`Лінза «${id}» не має датового правила.`);
    return build(date);
  });
  return {
    date,
    kind,
    symbol,
    claims,
    note: claims.length > 0 ? null : "symbol-missing",
  };
}
