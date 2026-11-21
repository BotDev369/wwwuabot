/**
 * Стан визначених якостей: профіль, ключ сховища й точкові системи. Окремо від
 * екрана, щоб сторінка лишалася про навігацію, а не про серіалізацію.
 *
 * @module web-platform-dev/src/pages/analysis/analysis-quality-state
 */

import {
  LENSES,
  LENS_QUALITIES,
  MEASURED_QUALITIES,
  type QualityClaim,
} from "@wwwuabot/shared/qualities";

export type QualityKind = "person" | "event";

export interface QualityProfile {
  date: string;
  kind: QualityKind;
  label: string;
}

/** Одне збережене визначення: рівні саме цієї якості. */
export interface StoredQuality {
  claims: QualityClaim[];
  checkedAt: string;
}

export type StoredMap = Record<string, StoredQuality>;

/** Системи, які взагалі можуть назвати цю якість. */
export function qualitySystems(qualityId: string): readonly string[] {
  const ids = LENSES.filter((lens) => LENS_QUALITIES[lens.id]?.includes(qualityId)).map(
    (lens) => lens.id,
  );
  if (MEASURED_QUALITIES.includes(qualityId)) ids.push("bigfive");
  return ids;
}

/** Ключ стану: профіль, а не вся платформа. */
export function storageKeyFor(profile: QualityProfile): string {
  if (!profile.date) return "";
  return `analysis-quality:v1:${profile.kind}:${profile.date}:${profile.label}`;
}

/**
 * Збережені визначення читаються з браузера: це стан саме цього профілю.
 * Пошкоджене сховище не повинно валити довідник, тому — порожня мапа.
 */
export function readStored(key: string): StoredMap {
  if (!key) return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const map: StoredMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const claims = (value as { claims?: unknown } | null)?.claims;
      if (!Array.isArray(claims)) continue;
      const checkedAt = (value as { checkedAt?: unknown } | null)?.checkedAt;
      map[id] = {
        claims: claims as QualityClaim[],
        checkedAt: typeof checkedAt === "string" ? checkedAt : "",
      };
    }
    return map;
  } catch {
    return {};
  }
}

export function writeStored(key: string, map: StoredMap): void {
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // Приватний режим або повне сховище: значення все одно є на екрані.
  }
}
