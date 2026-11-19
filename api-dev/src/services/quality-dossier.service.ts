/**
 * Портрет за датою: вибрані системи → свідчення й видимі розрахунки. Без
 * явного `lenses` портрет не існує; поряд зі свідченнями їдуть канонічні
 * показники, опис, межі й те, скількох якостей система не визначає.
 *
 * @module api-dev/src/services/quality-dossier.service
 */

import type { SubjectKind } from "@wwwuabot/shared/content";
import {
  LENSES,
  chainLabel,
  chineseClaims,
  mayanClaims,
  numerologyClaims,
  westernClaims,
  type QualityClaim,
} from "@wwwuabot/shared/qualities";
import { chineseProfile, mayanProfile, numerologyProfile } from "../shared/date-lens-calculators";
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
  /** Скільких якостей із 36 система не визначає — вони лишаються «Не знаємо». */
  readonly undetermined: number;
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

function currentYear(): number {
  return new Date().getUTCFullYear();
}

/**
 * Свідчення однієї системи. Дата не читається — помилка виклику, а не привід
 * повернути порожній набір; на екрані це вже перевірена дата.
 */
function claimsFor(id: string, date: string): readonly QualityClaim[] {
  if (id === "western") return westernClaims(westernProfile(date));
  if (id === "numerology") {
    const profile = numerologyProfile(date, currentYear());
    return profile ? numerologyClaims(profile) : [];
  }
  if (id === "chinese") {
    const profile = chineseProfile(date);
    return profile ? chineseClaims(profile) : [];
  }
  if (id === "mayan") {
    const profile = mayanProfile(date);
    return profile ? mayanClaims(profile) : [];
  }
  throw new Error(`Система «${id}» не має правила для дати.`);
}

function westernSystem(id: string, date: string): SystemRead {
  const lens = LENSES.find((candidate) => candidate.id === id);
  if (!lens) throw new Error(`Система «${id}» не зареєстрована.`);
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
  return { ...lens, parameters, undetermined: 0 };
}

function numerologySystem(id: string, date: string): SystemRead {
  const lens = LENSES.find((candidate) => candidate.id === id);
  const profile = numerologyProfile(date, currentYear());
  if (!lens) throw new Error(`Система «${id}» не зареєстрована.`);
  if (!profile) return { ...lens, parameters: [], undetermined: 36 };
  const parameters: SystemParameter[] = [
    { label: "Життєвий шлях", value: `${profile.lifePath} (${chainLabel(profile.lifePathChain)})` },
    { label: "Число дня", value: String(profile.birthday) },
    { label: "Ставлення", value: String(profile.attitude) },
    {
      label: `Особистий рік ${profile.personalYearOf}`,
      value: String(profile.personalYear),
    },
    ...profile.pinnacles.map((value, index) => ({
      label: `Пік ${index + 1} (${profile.pinnacleAges[index]}${profile.pinnacleAges[index + 1] === undefined ? "+" : `–${profile.pinnacleAges[index + 1]}`})`,
      value: String(value),
    })),
    ...profile.challenges.map((value, index) => ({
      label: `Виклик ${index + 1}`,
      value: String(value),
    })),
    {
      label: "Кармічний борг",
      value:
        profile.karmicDebt === null ? "немає" : `${profile.karmicDebt} (${profile.karmicWhere})`,
    },
  ];
  return { ...lens, parameters, undetermined: 0 };
}

function chineseSystem(id: string, date: string): SystemRead {
  const lens = LENSES.find((candidate) => candidate.id === id);
  const profile = chineseProfile(date);
  if (!lens) throw new Error(`Система «${id}» не зареєстрована.`);
  if (!profile) return { ...lens, parameters: [], undetermined: 36 };
  const parameters: SystemParameter[] = [
    { label: "Сонячний рік (Лічунь)", value: String(profile.solarYear) },
    {
      label: "Стовп року",
      value: `${profile.year.label}, ${profile.year.element}, ${profile.year.polarity}, ${profile.year.animal}`,
    },
    {
      label: "Стовп місяця",
      value: `${profile.month.label}, ${profile.month.element}, ${profile.month.polarity}`,
    },
    {
      label: "Сонячний термін",
      value: `${profile.solarTerm}, Сонце ${profile.solarLongitude.toFixed(2)}°`,
    },
    {
      label: "Стовп дня",
      value: `${profile.day.label}, ${profile.day.element}, ${profile.day.polarity}`,
    },
    { label: "Стовп години", value: "не визначається без часу народження" },
  ];
  return { ...lens, parameters, undetermined: 0 };
}

function mayanSystem(id: string, date: string): SystemRead {
  const lens = LENSES.find((candidate) => candidate.id === id);
  const profile = mayanProfile(date);
  if (!lens) throw new Error(`Система «${id}» не зареєстрована.`);
  if (!profile) return { ...lens, parameters: [], undetermined: 36 };
  const parameters: SystemParameter[] = [
    { label: "Кін", value: `${profile.kin} з 260` },
    { label: "Тон", value: `${profile.tone} з 13 — ${profile.toneName}` },
    { label: "Печатка", value: profile.seal },
    { label: "Хвиля (трецена)", value: `${profile.wave}, кін ${profile.waveKin}` },
    { label: "Довга лічба", value: profile.longCount },
    { label: "Кореляція", value: "GMT 584283" },
  ];
  return { ...lens, parameters, undetermined: 0 };
}

/**
 * Канонічні показники системи для цієї дати — те, що людина може перевірити в
 * будь-якому довіднику. Порожній список — «система не дала виходу».
 */
export function describeSystem(id: string, date: string, determined = 0): SystemRead | null {
  if (!LENSES.some((lens) => lens.id === id)) return null;
  if (id === "western") return { ...westernSystem(id, date), undetermined: 36 - determined };
  if (id === "numerology") return { ...numerologySystem(id, date), undetermined: 36 - determined };
  if (id === "chinese") return { ...chineseSystem(id, date), undetermined: 36 - determined };
  if (id === "mayan") return { ...mayanSystem(id, date), undetermined: 36 - determined };
  return null;
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
  const perSystem = lenses.map((id) => ({ id, claims: claimsFor(id, date) }));
  const claims = perSystem.flatMap((one) => one.claims);
  const systems = perSystem
    .map((one) =>
      describeSystem(one.id, date, new Set(one.claims.map((claim) => claim.qualityId)).size),
    )
    .filter((one): one is SystemRead => one !== null);
  if (kind === "event") {
    return { date, kind, symbol, claims: [], systems, note: "event-not-modelled" };
  }
  return {
    date,
    kind,
    symbol,
    claims,
    systems,
    note: claims.length > 0 ? null : "symbol-missing",
  };
}
