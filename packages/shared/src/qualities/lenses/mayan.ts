/**
 * Цолькін: кін, тон, печатка й хвиля з дати за кореляцією GMT 584283. Формули
 * від юліанського дня: кін = ((дні + 159) mod 260) + 1, тон = ((дні + 3) mod 13) + 1,
 * печатка = (дні + 19) mod 20. Довга лічба показується для звірки.
 * Таблиці й перевірка: `specs/analysis-core/07-systems.md`.
 *
 * @module @wwwuabot/shared/qualities/lenses/mayan
 */

import { makeClaim } from "../claims";
import type { LensDefinition, QualityClaim } from "../types";
import { strongestPerQuality, type LensRule } from "./rule";

export const MAYAN: LensDefinition = {
  id: "mayan",
  name: "Маянський Цолькін",
  version: "2",
  layer: "symbolic",
  inputs: ["date"],
  rule: "кін, тон, печатка й хвиля Цолькіна",
  about:
    "Цолькін — 260-денний цикл із 20 печаток і 13 тонів. Дата дає один із 260 днів (кін), " +
    "його тон і печатку, а також 13-денну хвилю (трецену), у якій цей день лежить.",
  gives: [
    "кін 1–260",
    "тональність 1–13",
    "печатку з 20",
    "хвилю (трецену) і день її початку",
    "довгу лічбу для звірки",
  ],
  limits: [
    "без часу народження немає володаря дня й годинного циклу",
    "довга лічба й календарне коло — окремі цикли, не прогноз",
    "кореляція GMT 584283: інші кореляції зсувають дату на 2 дні",
  ],
  history:
    "Цолькін — 260-денний цикл із 20 печаток і 13 тонів, частина маянського календаря. Кореляція GMT 584283 пов'язує його відлік із юліанським днем, тож дату можна порахувати точно.",
  spread:
    "Мезоамерика; з кінця XX ст. — світова популярна практика, найбільше в Мексиці й Гватемалі.",
  usage:
    "Календарні розрахунки й самопізнання. Ми беремо кін, тон, печатку й хвилю; володар дня потребує часу народження.",
  source:
    "Кореляція GMT 584283 (Томпсон): 2012-12-21 = 13.0.0.0.0 = 4 Ахау, кін 160; 2000-01-01 = 11 Ік, кін 102.",
};

/** Канонічний профіль Цолькіна на дату. */
export interface MayanProfile {
  readonly date: string;
  /** Юліанський день опівдні — основа всіх формул. */
  readonly julianDay: number;
  /** Днів від епохи 0.0.0.0.0. */
  readonly days: number;
  readonly kin: number;
  readonly tone: number;
  readonly toneName: string;
  readonly seal: string;
  readonly sealIndex: number;
  /** Номер трецени 1…20 — у якій лежить кін. */
  readonly trecena: number;
  /** Перший день хвилі: «1 Кіб». */
  readonly wave: string;
  readonly waveKin: number;
  /** Довга лічба: «12.19.6.15.2». */
  readonly longCount: string;
}

const SEALS: readonly (readonly [string, readonly LensRule[]])[] = [
  [
    "Іміш",
    [
      { qualityId: "care", level: 4, note: "помічає потребу" },
      { qualityId: "vitality", level: 4, note: "енергії більше, ніж планів" },
      { qualityId: "imagination", level: 3, note: "пропонує кілька варіантів" },
    ],
  ],
  [
    "Ік",
    [
      { qualityId: "verbal", level: 4, note: "слово дається легко" },
      { qualityId: "openness", level: 4, note: "іде в незнайоме першим" },
      { qualityId: "tempo", level: 3, note: "перемикається швидко" },
    ],
  ],
  [
    "Акбаль",
    [
      { qualityId: "focus", level: 4, note: "тримає одну задачу" },
      { qualityId: "analysis", level: 4, note: "розкладає на частини" },
      { qualityId: "stressResilience", level: 3, note: "витримує тиск" },
    ],
  ],
  [
    "Кан",
    [
      { qualityId: "openness", level: 4, note: "приймає несподіване" },
      { qualityId: "learning", level: 4, note: "вчиться з досвіду" },
      { qualityId: "playfulness", level: 3, note: "проба без гарантії" },
    ],
  ],
  [
    "Чикчан",
    [
      { qualityId: "initiative", level: 4, note: "починає рух" },
      { qualityId: "leadership", level: 4, note: "бере кермо" },
      { qualityId: "endurance", level: 3, note: "тримає темп" },
    ],
  ],
  [
    "Кімі",
    [
      { qualityId: "honesty", level: 4, note: "каже як є" },
      { qualityId: "care", level: 4, note: "не кидає напризволяще" },
      { qualityId: "purposefulness", level: 3, note: "доводить до кінця" },
    ],
  ],
  [
    "Манік",
    [
      { qualityId: "precision", level: 4, note: "перевіряє деталі" },
      { qualityId: "recovery", level: 4, note: "відновлюється після збою" },
      { qualityId: "discipline", level: 3, note: "тримає режим" },
    ],
  ],
  [
    "Ламат",
    [
      { qualityId: "cooperation", level: 4, note: "збирає людей" },
      { qualityId: "empathy", level: 4, note: "чує стан" },
      { qualityId: "care", level: 3, note: "бере частину іншого" },
    ],
  ],
  [
    "Мулук",
    [
      { qualityId: "care", level: 4, note: "тримає чужу потребу" },
      { qualityId: "honesty", level: 3, note: "не обманює" },
      { qualityId: "endurance", level: 3, note: "витримує довго" },
    ],
  ],
  [
    "Ок",
    [
      { qualityId: "honesty", level: 4, note: "платить ціну за правду" },
      { qualityId: "closeness", level: 4, note: "тримає близькість" },
      { qualityId: "purposefulness", level: 3, note: "не зраджує напрям" },
    ],
  ],
  [
    "Чуен",
    [
      { qualityId: "playfulness", level: 4, note: "робить нове" },
      { qualityId: "imagination", level: 4, note: "бачить варіанти" },
      { qualityId: "aesthetics", level: 3, note: "має смак" },
    ],
  ],
  [
    "Еб",
    [
      { qualityId: "openness", level: 4, note: "іде в незнайоме" },
      { qualityId: "verbal", level: 3, note: "домовляється" },
      { qualityId: "tempo", level: 3, note: "швидко перемикається" },
    ],
  ],
  [
    "Бен",
    [
      { qualityId: "leadership", level: 4, note: "веде за собою" },
      { qualityId: "planning", level: 4, note: "бачить послідовність" },
      { qualityId: "purposefulness", level: 3, note: "тримає ціль" },
    ],
  ],
  [
    "Іш",
    [
      { qualityId: "analysis", level: 4, note: "перевіряє припущення" },
      { qualityId: "abstraction", level: 4, note: "бачить схему" },
      { qualityId: "precision", level: 3, note: "ловить невідповідність" },
    ],
  ],
  [
    "Мен",
    [
      { qualityId: "leadership", level: 4, note: "бере відповідальність" },
      { qualityId: "organization", level: 4, note: "ставить систему" },
      { qualityId: "precision", level: 3, note: "тримає стандарт" },
    ],
  ],
  [
    "Кіб",
    [
      { qualityId: "focus", level: 4, note: "заглиблюється" },
      { qualityId: "organization", level: 4, note: "наводить лад" },
      { qualityId: "imagination", level: 3, note: "бачить невидиме" },
    ],
  ],
  [
    "Кабан",
    [
      { qualityId: "learning", level: 4, note: "шукає знання" },
      { qualityId: "analysis", level: 3, note: "розбирає задачу" },
      { qualityId: "openness", level: 3, note: "приймає нове" },
    ],
  ],
  [
    "Ецнаб",
    [
      { qualityId: "honesty", level: 4, note: "тримає слово" },
      { qualityId: "listening", level: 4, note: "чує іншого" },
      { qualityId: "analysis", level: 3, note: "шукає істину" },
    ],
  ],
  [
    "Кауак",
    [
      { qualityId: "stressResilience", level: 4, note: "тримається в бурі" },
      { qualityId: "care", level: 4, note: "не лишає в біді" },
      { qualityId: "vitality", level: 3, note: "відновлюється" },
    ],
  ],
  [
    "Ахау",
    [
      { qualityId: "imagination", level: 4, note: "бачить ціле" },
      { qualityId: "purposefulness", level: 4, note: "тримає напрям" },
      { qualityId: "listening", level: 3, note: "чує тишу" },
    ],
  ],
];

const TONES: readonly (readonly [string, LensRule])[] = [
  ["Магнітна", { qualityId: "purposefulness", level: 3, note: "тон 1 задає напрям" }],
  ["Місячна", { qualityId: "empathy", level: 3, note: "тон 2 задає чутливість" }],
  ["Електрична", { qualityId: "initiative", level: 3, note: "тон 3 задає рух" }],
  ["Самосуща", { qualityId: "precision", level: 3, note: "тон 4 задає форму" }],
  ["Панівна", { qualityId: "leadership", level: 3, note: "тон 5 задає кермо" }],
  ["Ритмічна", { qualityId: "organization", level: 3, note: "тон 6 задає рівновагу" }],
  ["Резонансна", { qualityId: "listening", level: 3, note: "тон 7 задає налаштування" }],
  ["Галактична", { qualityId: "honesty", level: 3, note: "тон 8 задає цілісність" }],
  ["Сонячна", { qualityId: "vitality", level: 3, note: "тон 9 задає енергію" }],
  ["Планетарна", { qualityId: "organization", level: 3, note: "тон 10 задає прояв" }],
  ["Спектральна", { qualityId: "openness", level: 3, note: "тон 11 задає вивільнення" }],
  ["Кристалічна", { qualityId: "cooperation", level: 3, note: "тон 12 задає спільність" }],
  ["Космічна", { qualityId: "abstraction", level: 3, note: "тон 13 задає вихід за межі" }],
];

/** Якості, які ця лінза може назвати: для довідника «хто це визначає». */
export const MAYAN_QUALITIES: readonly string[] = [
  ...new Set([
    ...SEALS.flatMap(([, rules]) => rules.map((rule) => rule.qualityId)),
    ...TONES.map(([, rule]) => rule.qualityId),
  ]),
].sort();

export const MAYAN_DAY_SIGNS: readonly string[] = SEALS.map(([name]) => name);

/** Печатка за індексом 0…19; сервер бере індекс із формули. */
export function mayanSeal(index: number): string | null {
  return SEALS[index]?.[0] ?? null;
}

/** Перевірка, що число тональності не вигадане. */
export function mayanTone(value: number): string | null {
  return TONES[value - 1]?.[0] ?? null;
}

function claim(
  profile: MayanProfile,
  rule: LensRule,
  evidence: string,
  details: readonly string[],
): QualityClaim {
  return makeClaim({
    qualityId: rule.qualityId,
    level: rule.level,
    layer: "symbolic",
    sourceId: MAYAN.id,
    sourceVersion: MAYAN.version,
    method: "mapped",
    evidence: `${evidence}: ${rule.note}`,
    details: [`Дата: ${profile.date}`, ...details],
  });
}

/**
 * Свідчення печатки, тону й хвилі. Хвиля бере характер свого першого дня —
 * це традиційне правило трецени, а не наше узагальнення.
 */
export function mayanClaims(profile: MayanProfile): readonly QualityClaim[] {
  const seal = SEALS[profile.sealIndex];
  if (!seal) throw new Error(`Печатки «${profile.seal}» немає в таблиці Цолькіна.`);

  const base = `Кін ${profile.kin}: ${profile.tone} ${profile.seal}`;
  const common = [
    `Довга лічба: ${profile.longCount}; юліанський день ${profile.julianDay}.`,
    `Кореляція GMT 584283, днів від епохи: ${profile.days}.`,
  ];

  const claims: QualityClaim[] = seal[1].map((rule) =>
    claim(profile, rule, base, [
      ...common,
      `Правило: печатка ${profile.seal} дає «${rule.note}» → рівень ${rule.level}.`,
    ]),
  );

  const toneRule = TONES[profile.tone - 1]?.[1];
  if (toneRule) {
    claims.push(
      claim(profile, toneRule, `Тон ${profile.tone} (${profile.toneName})`, [
        ...common,
        `Правило: тон ${profile.tone} дає «${toneRule.note}» → рівень ${toneRule.level}.`,
      ]),
    );
  }

  const waveSealIndex = (profile.waveKin - 1) % 20;
  const waveSeal = SEALS[waveSealIndex];
  const waveRule = waveSeal?.[1][0];
  if (waveRule) {
    claims.push(
      claim(
        profile,
        { ...waveRule, level: 2, note: `хвиля ${profile.wave}: ${waveRule.note}` },
        `Хвиля ${profile.wave}`,
        [
          ...common,
          `Трецена ${profile.trecena}: від кіна ${profile.waveKin} до ${profile.waveKin + 12}.`,
          `Правило: характер хвилі задає її перший день «${profile.wave}» → рівень 2.`,
        ],
      ),
    );
  }

  return strongestPerQuality(claims);
}
