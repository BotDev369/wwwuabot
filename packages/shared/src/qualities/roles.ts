/**
 * Ролі пари: які якості ядро вважає опорою для половинки, друга, партнера й
 * працівника. Це структуровані правила з джерелом, а не текст у JSX; оцінки
 * людей і відсотків сумісності тут немає.
 *
 * @module @wwwuabot/shared/qualities/roles
 */

import { QUALITIES, QUALITY_DOMAINS, getQuality } from "./domains";
import type { ClaimLayer, Quality, QualityClaim, QualityDomain, QualityLevel } from "./types";

export const ROLE_IDS = ["partner", "friend", "business", "employee"] as const;
export type RoleId = (typeof ROLE_IDS)[number];

/** Джерело правила: дослідження або рамка, на яку спирається набір якостей. */
export interface RoleSource {
  readonly id: string;
  readonly title: string;
  readonly note: string;
}

/** Одна потреба ролі: якість і пороги опори та ризику. */
export interface RoleNeed {
  readonly qualityId: string;
  /** Опора — коли **кожен** має рівень не нижче цього. */
  readonly threshold: QualityLevel;
  /** Ризик — коли **кожен** має рівень не вище цього. */
  readonly risk: QualityLevel;
  readonly sourceId: string;
}

export interface RoleDefinition {
  readonly id: RoleId;
  readonly name: string;
  readonly lead: string;
  readonly needs: readonly RoleNeed[];
  readonly sources: readonly RoleSource[];
}

const SOURCES = {
  gottman: {
    id: "gottman-1999",
    title: "Gottman & Silver, The Seven Principles for Making Marriage Work (1999)",
    note: "довіра, налаштованість на іншого й ремонт після конфлікту",
  },
  hall: {
    id: "hall-2012",
    title: "Hall, Friendship Standards: Content and Structure (2012)",
    note: "стандарти дружби: підтримка, відкритість, спільна гра",
  },
  wasserman: {
    id: "wasserman-2012",
    title: "Wasserman, The Founder's Dilemmas (2012)",
    note: "довіра й розподіл ролей у засновницькій парі",
  },
  zak: {
    id: "zak-2017",
    title: "Zak, The Neuroscience of Trust (Harvard Business Review, 2017)",
    note: "довіра як умова спільної роботи",
  },
  barrick: {
    id: "barrick-mount-1991",
    title: "Barrick & Mount, The Big Five and job performance (1991)",
    note: "сумлінність як найстабільніший предиктор виконання",
  },
  salas: {
    id: "salas-2015",
    title: "Salas et al., Teamwork and team training (2015)",
    note: "кооперація й координація в команді",
  },
  lombardo: {
    id: "lombardo-2010",
    title: "Lombardo & Eichinger, The Leadership Machine (2010)",
    note: "навчання й ініціатива як ріст у ролі",
  },
} as const satisfies Record<string, RoleSource>;

/**
 * Чотири ролі. Пороги — не «ідеальний профіль», а межа, за якою якість стає
 * опорою або спільною прогалиною; усе між ними — нейтральне.
 */
export const ROLES: readonly RoleDefinition[] = [
  {
    id: "partner",
    name: "Половинка",
    lead: "Близькість, довіра й здатність повертатися в контакт після напруги.",
    needs: [
      { qualityId: "empathy", threshold: 4, risk: 2, sourceId: "gottman-1999" },
      { qualityId: "care", threshold: 4, risk: 2, sourceId: "gottman-1999" },
      { qualityId: "honesty", threshold: 4, risk: 2, sourceId: "gottman-1999" },
      { qualityId: "listening", threshold: 3, risk: 2, sourceId: "gottman-1999" },
      { qualityId: "closeness", threshold: 3, risk: 2, sourceId: "gottman-1999" },
      { qualityId: "cooperation", threshold: 3, risk: 2, sourceId: "gottman-1999" },
      { qualityId: "stressResilience", threshold: 3, risk: 2, sourceId: "gottman-1999" },
    ],
    sources: [SOURCES.gottman],
  },
  {
    id: "friend",
    name: "Друг",
    lead: "Опора без обов'язку бути поруч щодня: чути, не зраджувати, радіти разом.",
    needs: [
      { qualityId: "listening", threshold: 4, risk: 2, sourceId: "hall-2012" },
      { qualityId: "honesty", threshold: 4, risk: 2, sourceId: "hall-2012" },
      { qualityId: "care", threshold: 4, risk: 2, sourceId: "hall-2012" },
      { qualityId: "empathy", threshold: 3, risk: 2, sourceId: "hall-2012" },
      { qualityId: "playfulness", threshold: 3, risk: 2, sourceId: "hall-2012" },
      { qualityId: "openness", threshold: 3, risk: 2, sourceId: "hall-2012" },
      { qualityId: "closeness", threshold: 3, risk: 2, sourceId: "hall-2012" },
    ],
    sources: [SOURCES.hall],
  },
  {
    id: "business",
    name: "Партнер",
    lead: "Спільна справа: довіра, домовленість і здатність довести до результату.",
    needs: [
      { qualityId: "honesty", threshold: 4, risk: 2, sourceId: "wasserman-2012" },
      { qualityId: "cooperation", threshold: 4, risk: 2, sourceId: "wasserman-2012" },
      { qualityId: "purposefulness", threshold: 4, risk: 2, sourceId: "wasserman-2012" },
      { qualityId: "enterprise", threshold: 3, risk: 2, sourceId: "wasserman-2012" },
      { qualityId: "planning", threshold: 3, risk: 2, sourceId: "wasserman-2012" },
      { qualityId: "verbal", threshold: 3, risk: 2, sourceId: "zak-2017" },
      { qualityId: "stressResilience", threshold: 3, risk: 2, sourceId: "zak-2017" },
    ],
    sources: [SOURCES.wasserman, SOURCES.zak],
  },
  {
    id: "employee",
    name: "Працівник",
    lead: "Робоча роль: дисципліна, команда й здатність вчитися на ходу.",
    needs: [
      { qualityId: "discipline", threshold: 4, risk: 2, sourceId: "barrick-mount-1991" },
      { qualityId: "cooperation", threshold: 4, risk: 2, sourceId: "salas-2015" },
      { qualityId: "learning", threshold: 4, risk: 2, sourceId: "lombardo-2010" },
      { qualityId: "organization", threshold: 3, risk: 2, sourceId: "barrick-mount-1991" },
      { qualityId: "precision", threshold: 3, risk: 2, sourceId: "barrick-mount-1991" },
      { qualityId: "stressResilience", threshold: 3, risk: 2, sourceId: "salas-2015" },
      { qualityId: "initiative", threshold: 3, risk: 2, sourceId: "lombardo-2010" },
      { qualityId: "purposefulness", threshold: 3, risk: 2, sourceId: "lombardo-2010" },
    ],
    sources: [SOURCES.barrick, SOURCES.salas, SOURCES.lombardo],
  },
];

/** Роль за ключем; невідомий ключ — половинка, бо це типовий вхід. */
export function getRole(id: string | null | undefined): RoleDefinition {
  return ROLES.find((role) => role.id === id) ?? ROLES[0];
}

/** Роль з адреси: невідоме значення не ламає екран. */
export function parseRole(value: string | null | undefined): RoleId {
  return getRole(value).id;
}

/**
 * Пріоритет шарів доказів: виміряне не усереднюється із символічним, а
 * перекриває його. Символічне заповнює прогалину, коли виміряного немає.
 */
export const LAYER_PRIORITY: Readonly<Record<ClaimLayer, number>> = {
  measured: 3,
  narrative: 2,
  symbolic: 1,
};

export interface ResolvedQuality {
  readonly quality: Quality;
  readonly level: QualityLevel | null;
  readonly layer: ClaimLayer | null;
  /** Джерела, які дали рівень; порожньо — коли рівня немає. */
  readonly sources: readonly string[];
  /** Усередині шару-переможця рівні розійшлися. */
  readonly unsettled: boolean;
}

function leadingLevel(claims: readonly QualityClaim[]): QualityLevel | null {
  if (claims.length === 0) return null;
  const weight: Record<QualityLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const claim of claims) weight[claim.level] += claim.confidence;
  let best: QualityLevel | null = null;
  for (const level of [1, 2, 3, 4, 5] as const) {
    if (weight[level] > 0 && (best === null || weight[level] >= weight[best])) best = level;
  }
  return best;
}

/**
 * Рівень якості для ролі: спершу виміряне, потім наратив, потім дата. Рівні
 * всередині шару-переможця не усереднюються — розбіжність лишається
 * розбіжністю й позначається як «системи розійшлися».
 */
export function resolveQuality(claims: readonly QualityClaim[], quality: Quality): ResolvedQuality {
  const own = claims.filter((claim) => claim.qualityId === quality.id);
  if (own.length === 0) {
    return { quality, level: null, layer: null, sources: [], unsettled: false };
  }
  const top = own.reduce((best, claim) => Math.max(best, LAYER_PRIORITY[claim.layer]), 0);
  const pool = own.filter((claim) => LAYER_PRIORITY[claim.layer] === top);
  const layer = pool[0].layer;
  const levels = new Set(pool.map((claim) => claim.level));
  const sources = [...new Set(pool.map((claim) => claim.sourceId))];
  if (levels.size > 1) {
    return { quality, level: null, layer, sources, unsettled: true };
  }
  return { quality, level: leadingLevel(pool), layer, sources, unsettled: false };
}

export type RoleStatus = "support" | "neutral" | "risk" | "unknown";

export interface RolePersonReading {
  readonly label: string;
  readonly level: QualityLevel | null;
  readonly layer: ClaimLayer | null;
  readonly sources: readonly string[];
  readonly unsettled: boolean;
}

export interface RoleQualityView {
  readonly quality: Quality;
  readonly need: RoleNeed;
  readonly people: readonly RolePersonReading[];
  readonly status: RoleStatus;
}

/** Домен ролі: скільки його якостей в опорі, ризику, нейтралі чи без даних. */
export interface RoleDomainView {
  readonly domain: QualityDomain;
  readonly support: number;
  readonly neutral: number;
  readonly risk: number;
  readonly unknown: number;
  readonly status: RoleStatus;
}

export interface RoleMatchPerson {
  readonly label: string;
  /** Скільком із 36 якостей людина дала рівень. */
  readonly known: number;
  readonly systems: number;
}

export interface RoleMatch {
  readonly role: RoleDefinition;
  readonly people: readonly RoleMatchPerson[];
  readonly support: readonly RoleQualityView[];
  readonly neutral: readonly RoleQualityView[];
  readonly risk: readonly RoleQualityView[];
  readonly unknown: readonly RoleQualityView[];
  readonly domains: readonly RoleDomainView[];
}

/** Домен якості; `null` — якість поза ядром, що є помилкою даних. */
export function domainOfQuality(qualityId: string): QualityDomain | null {
  return (
    QUALITY_DOMAINS.find((domain) =>
      domain.qualities.some((quality) => quality.id === qualityId),
    ) ?? null
  );
}

function statusOf(people: readonly RolePersonReading[], need: RoleNeed): RoleStatus {
  const levels = people.map((person) => person.level);
  if (levels.some((level) => level === null)) return "unknown";
  const known = levels as QualityLevel[];
  if (known.every((level) => level >= need.threshold)) return "support";
  if (known.every((level) => level <= need.risk)) return "risk";
  return "neutral";
}

function domainStatus(views: readonly RoleQualityView[]): RoleStatus {
  if (views.every((view) => view.status === "unknown")) return "unknown";
  if (views.some((view) => view.status === "risk")) return "risk";
  if (
    views.filter((view) => view.status !== "unknown").every((view) => view.status === "support")
  ) {
    return "support";
  }
  return "neutral";
}

/**
 * Оцінка ролі для двох (або більше) людей. Роль — це пара, тож «опора» означає
 * «в кожного є», а «ризик» — «ні в кого немає»; змішаний рівень нейтральний.
 */
export function matchRole(
  role: RoleDefinition,
  people: readonly { readonly label: string; readonly claims: readonly QualityClaim[] }[],
): RoleMatch {
  const views = role.needs.map((need) => {
    const quality = getQuality(need.qualityId);
    if (!quality) throw new Error(`Роль «${role.id}»: якості «${need.qualityId}» немає в ядрі.`);
    const readings = people.map((person) => {
      const resolved = resolveQuality(person.claims, quality);
      return {
        label: person.label,
        level: resolved.level,
        layer: resolved.layer,
        sources: resolved.sources,
        unsettled: resolved.unsettled,
      };
    });
    return { quality, need, people: readings, status: statusOf(readings, need) };
  });

  const domains = QUALITY_DOMAINS.flatMap((domain) => {
    const own = views.filter((view) => domain.qualities.some((one) => one.id === view.quality.id));
    if (own.length === 0) return [];
    const count = (status: RoleStatus): number =>
      own.filter((view) => view.status === status).length;
    return [
      {
        domain,
        support: count("support"),
        neutral: count("neutral"),
        risk: count("risk"),
        unknown: count("unknown"),
        status: domainStatus(own),
      },
    ];
  });

  const pick = (status: RoleStatus): RoleQualityView[] =>
    views.filter((view) => view.status === status);

  return {
    role,
    people: people.map((person) => ({
      label: person.label,
      known: QUALITIES.filter((quality) => resolveQuality(person.claims, quality).level !== null)
        .length,
      systems: new Set(person.claims.map((claim) => claim.sourceId)).size,
    })),
    support: pick("support"),
    neutral: pick("neutral"),
    risk: pick("risk"),
    unknown: pick("unknown"),
    domains,
  };
}
