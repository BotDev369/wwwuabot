/**
 * Портрет за датою: вибрані системи → свідчення й видимі розрахунки. Без
 * явного `lenses` портрет не існує; поряд зі свідченнями їдуть канонічні
 * показники, опис і межі системи. Подія не отримує рис людини (`note`).
 *
 * @module api-dev/src/services/quality-dossier.service
 */

import type { SubjectKind } from "@wwwuabot/shared/content";
import {
  LENSES,
  chineseClaims,
  mayanClaims,
  numerologyClaims,
  westernClaims,
  type QualityClaim,
} from "@wwwuabot/shared/qualities";
import { chineseAnimalOf, lifePathOf, tzolkinOf } from "../shared/date-lens-calculators";
import { westernProfile } from "../shared/western-calculator";

/** Один показник системи: те, що справді пораховано з дати. */
export interface SystemParameter {
  readonly label: string;
  readonly value: string;
}

/** Система на екрані: опис, межі й повний перелік показників. */
export interface SystemRead {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly about?: string;
  readonly gives?: readonly string[];
  readonly limits?: readonly string[];
  readonly source?: string;
  readonly parameters: readonly SystemParameter[];
}

/** Портрет одного суб'єкта: дата, вид, символ і свідчення вибраних систем. */
export interface DossierRead {
  readonly date: string;
  readonly kind: SubjectKind;
  readonly symbol: string | null;
  readonly claims: readonly QualityClaim[];
  /** Повні розрахунки кожної вибраної системи — для цієї дати. */
  readonly systems: readonly SystemRead[];
  /** Чому якостей немає; `null` — профіль людини порахований. */
  readonly note: "event-not-modelled" | "symbol-missing" | null;
}

/** Знак Сонця з того самого канонічного профілю, що й таблиця. */
export function sunSignOf(date: string): string | null {
  try {
    return westernProfile(date).sign;
  } catch {
    return null;
  }
}

const BUILDERS: Readonly<Record<string, (date: string) => readonly QualityClaim[]>> = {
  western: (date) => {
    try {
      return westernClaims(westernProfile(date));
    } catch {
      return [];
    }
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
 * Канонічні показники системи для цієї дати — те, що людина може перевірити
 * в будь-якому довіднику. Порожній список означає «система не дала виходу»,
 * а не «нічого не порахували».
 */
export function describeSystem(id: string, date: string): SystemRead | null {
  const lens = LENSES.find((candidate) => candidate.id === id);
  if (!lens) return null;

  if (id === "western") {
    const profile = westernProfile(date);
    const parameters: SystemParameter[] = [
      { label: "Знак Сонця", value: profile.sign },
      { label: "Градус Сонця", value: `${profile.sunLabel} (${profile.at})` },
      { label: "Декан", value: `${profile.decan}-й з 10°` },
      { label: "Управитель декана", value: profile.decanRuler },
      { label: "Єгипетська межа", value: profile.boundLabel },
      { label: "Двадашамша", value: profile.dwad },
      { label: "Стихія", value: profile.element },
      { label: "Хрест", value: profile.modality },
      { label: "Полярність", value: profile.polarity },
      { label: "Управитель", value: profile.ruler },
      { label: "Традиційний управитель", value: profile.traditionalRuler },
    ];
    if (profile.ambiguous.length > 0) {
      parameters.push({ label: "Змінюється за добу", value: profile.ambiguous.join("; ") });
    }
    return { ...lens, parameters };
  }

  if (id === "numerology") {
    const lifePath = lifePathOf(date);
    return lifePath === null
      ? { ...lens, parameters: [] }
      : { ...lens, parameters: [{ label: "Число життєвого шляху", value: String(lifePath) }] };
  }

  if (id === "chinese") {
    const animal = chineseAnimalOf(date);
    return animal
      ? {
          ...lens,
          parameters: [
            { label: "Тварина року", value: animal },
            { label: "Межа року", value: "Лічунь, 4 лютого" },
          ],
        }
      : { ...lens, parameters: [] };
  }

  if (id === "mayan") {
    const day = tzolkinOf(date);
    return day
      ? {
          ...lens,
          parameters: [
            { label: "Печатка", value: day.sign },
            { label: "Тональність", value: `${day.tone} з 13` },
            { label: "Кореляція", value: "GMT 584283" },
          ],
        }
      : { ...lens, parameters: [] };
  }

  return { ...lens, parameters: [] };
}

/**
 * Портрет одного суб'єкта за вибраними системами. Порожній або невідомий
 * вибір — помилка виклику, а не привід тихо порахувати «щось».
 */
export function buildDossier(
  date: string,
  kind: SubjectKind,
  lenses: readonly string[],
): DossierRead {
  const symbol = sunSignOf(date);
  const systems = lenses
    .map((id) => describeSystem(id, date))
    .filter((one): one is SystemRead => one !== null);
  if (kind === "event") {
    return { date, kind, symbol, claims: [], systems, note: "event-not-modelled" };
  }
  const claims = lenses.flatMap((id) => {
    const build = BUILDERS[id];
    if (!build) throw new Error(`Система «${id}» не має правила для дати.`);
    return build(date);
  });
  return {
    date,
    kind,
    symbol,
    claims,
    systems,
    note: claims.length > 0 ? null : "symbol-missing",
  };
}
