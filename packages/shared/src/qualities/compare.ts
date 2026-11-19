/**
 * Співставлення людей на ядрі: що об'єднує, де різні опори й де бракує даних.
 * Непокрита якість не рахується розбіжністю. Оцінок «краще/гірше» немає.
 *
 * @module @wwwuabot/shared/qualities/compare
 */

import { QUALITY_DOMAINS } from "./domains";
import { readQuality } from "./reading";
import type { Quality, QualityClaim, QualityDomain, QualityLevel } from "./types";

/** Людина в співставленні: підпис і всі її свідчення. */
export interface ComparePerson {
  readonly label: string;
  readonly claims: readonly QualityClaim[];
}

/** Що співставлення говорить про якість. */
export type CompareKind = "shared" | "close" | "tension" | "partial" | "missing" | "unsettled";

/** Рівень людини в одній якості: число, «системи розійшлися» або «немає». */
export interface CompareCell {
  readonly label: string;
  readonly level: QualityLevel | null;
  readonly state: "level" | "unsettled" | "missing";
}

/** Одна якість у співставленні: клітинки людей і висновок із них. */
export interface CompareQuality {
  readonly quality: Quality;
  readonly domain: QualityDomain;
  readonly cells: readonly CompareCell[];
  /** Скільки людей мають узгоджений рівень. */
  readonly coverage: number;
  /** Різниця між найвищим і найнижчим рівнем; 0, якщо порівнювати нема з чим. */
  readonly spread: number;
  readonly kind: CompareKind;
}

/** Збіг у домені: скільки спільних якостей читаються однаково. */
export interface CompareDomain {
  readonly domain: QualityDomain;
  readonly compared: number;
  readonly agree: number;
  /** `agree / compared`; 0, коли порівнювати нічого. */
  readonly agreement: number;
}

/** Внесок систем однієї людини: скільки якостей дав кожен источник. */
export interface CompareSystem {
  readonly sourceId: string;
  readonly qualities: number;
}

/** Покритість людини: скільком якостям вона дала рівень. */
export interface ComparePersonCoverage {
  readonly label: string;
  readonly known: number;
  readonly systems: readonly CompareSystem[];
}

export interface CompareResult {
  readonly people: readonly ComparePersonCoverage[];
  /** Усі люди мають рівень, і кожен рівень 4–5. */
  readonly shared: readonly CompareQuality[];
  /** Усі мають рівень, і різниця між ними 2+. */
  readonly tension: readonly CompareQuality[];
  /** Рівень є не в усіх — якість не рахується розбіжністю. */
  readonly partial: readonly CompareQuality[];
  /** Узгодженого рівня немає ні в кого. */
  readonly missing: readonly CompareQuality[];
  /** Домени з найвищим збігом; тільки ті, де є що порівнювати. */
  readonly domains: readonly CompareDomain[];
  /** Скільки якостей порівнюються в усіх людей. */
  readonly compared: number;
}

function kindOf(cells: readonly CompareCell[], coverage: number): CompareKind {
  if (coverage === 0) return "missing";
  if (coverage < cells.length) {
    return cells.some((cell) => cell.state === "unsettled") ? "unsettled" : "partial";
  }
  const levels = cells.map((cell) => cell.level as QualityLevel);
  const spread = Math.max(...levels) - Math.min(...levels);
  if (spread >= 2) return "tension";
  return Math.min(...levels) >= 4 ? "shared" : "close";
}

function cellOf(person: ComparePerson, quality: Quality): CompareCell {
  const reading = readQuality(person.claims, quality);
  if (reading.claims.length === 0) {
    return { label: person.label, level: null, state: "missing" };
  }
  if (reading.level === null) {
    return { label: person.label, level: null, state: "unsettled" };
  }
  return { label: person.label, level: reading.level, state: "level" };
}

function average(levels: readonly QualityLevel[]): number {
  return levels.reduce((sum, level) => sum + level, 0) / levels.length;
}

/** Найвищий збіг — спершу за згодою, далі за кількістю спільних якостей. */
function byAgreement(a: CompareDomain, b: CompareDomain): number {
  return (
    b.agreement - a.agreement ||
    b.compared - a.compared ||
    a.domain.name.localeCompare(b.domain.name)
  );
}

/** Внесок систем людини: джерела без повторів, найбільший внесок спершу. */
function systemsOf(person: ComparePerson): CompareSystem[] {
  const counts = new Map<string, Set<string>>();
  for (const claim of person.claims) {
    const qualities = counts.get(claim.sourceId) ?? new Set<string>();
    qualities.add(claim.qualityId);
    counts.set(claim.sourceId, qualities);
  }
  return [...counts.entries()]
    .map(([sourceId, qualities]) => ({ sourceId, qualities: qualities.size }))
    .sort((a, b) => b.qualities - a.qualities || a.sourceId.localeCompare(b.sourceId));
}

/**
 * Співставити двох або більше людей. Порожній перелік — порожній результат, а
 * не помилка: екран сам каже, що людей для співставлення немає.
 */
export function comparePeople(people: readonly ComparePerson[]): CompareResult {
  if (people.length === 0) {
    return {
      people: [],
      shared: [],
      tension: [],
      partial: [],
      missing: [],
      domains: [],
      compared: 0,
    };
  }

  const all: CompareQuality[] = [];

  for (const domain of QUALITY_DOMAINS) {
    for (const quality of domain.qualities) {
      const cells = people.map((person) => cellOf(person, quality));
      const coverage = cells.filter((cell) => cell.state === "level").length;
      const levels = cells
        .map((cell) => cell.level)
        .filter((level): level is QualityLevel => level !== null);
      all.push({
        quality,
        domain,
        cells,
        coverage,
        spread: levels.length > 1 ? Math.max(...levels) - Math.min(...levels) : 0,
        kind: kindOf(cells, coverage),
      });
    }
  }

  const shared = all
    .filter((one) => one.kind === "shared")
    .sort(
      (a, b) =>
        Math.min(...b.cells.map((cell) => cell.level as QualityLevel)) -
          Math.min(...a.cells.map((cell) => cell.level as QualityLevel)) ||
        average(b.cells.map((cell) => cell.level as QualityLevel)) -
          average(a.cells.map((cell) => cell.level as QualityLevel)) ||
        a.quality.name.localeCompare(b.quality.name),
    );

  const tension = all
    .filter((one) => one.kind === "tension")
    .sort(
      (a, b) =>
        b.spread - a.spread ||
        Math.min(...a.cells.map((cell) => cell.level as QualityLevel)) -
          Math.min(...b.cells.map((cell) => cell.level as QualityLevel)) ||
        a.quality.name.localeCompare(b.quality.name),
    );

  const partial = all
    .filter((one) => one.kind === "partial" || one.kind === "unsettled")
    .sort((a, b) => b.coverage - a.coverage || a.quality.name.localeCompare(b.quality.name));

  const missing = all
    .filter((one) => one.kind === "missing")
    .sort((a, b) => a.quality.name.localeCompare(b.quality.name));

  const domains = QUALITY_DOMAINS.map((domain) => {
    const own = all.filter((one) => one.domain.id === domain.id && one.coverage === people.length);
    const agree = own.filter((one) => one.spread <= 1).length;
    return {
      domain,
      compared: own.length,
      agree,
      agreement: own.length === 0 ? 0 : agree / own.length,
    };
  })
    .filter((one) => one.compared > 0)
    .sort(byAgreement);

  return {
    people: people.map((person, index) => ({
      label: person.label,
      known: all.filter((one) => one.cells[index]?.state === "level").length,
      systems: systemsOf(person),
    })),
    shared,
    tension,
    partial,
    missing,
    domains,
    compared: all.filter((one) => one.coverage === people.length).length,
  };
}
