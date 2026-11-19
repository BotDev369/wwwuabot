/**
 * Китайські стовпи: рік, місяць і день як «стовбур + гілка». Рік — за Лічунем,
 * місяць — за 30-градусними сонячними термінами, день — за 60-денним циклом.
 * Стовп години потребує часу народження й свідомо не рахується.
 * Таблиці й формули: `specs/analysis-core/07-systems.md`.
 *
 * @module @wwwuabot/shared/qualities/lenses/chinese
 */

import { makeClaim } from "../claims";
import type { LensDefinition, QualityClaim } from "../types";
import { strongestPerQuality, type LensRule } from "./rule";

export const CHINESE: LensDefinition = {
  id: "chinese",
  name: "Китайська традиція",
  version: "2",
  layer: "symbolic",
  inputs: ["date"],
  rule: "стовпи року, місяця й дня за сонячними термінами",
  about:
    "Ба-Цзи читає дату як три стовпи: рік, місяць і день. Кожен стовп — пара «Небесний стовбур + Земна гілка» " +
    "зі своїм елементом і полярністю. Рік починається на Лічунь, а місяць — на сонячному терміні, не 1-го числа.",
  gives: [
    "стовп року: стовбур, гілка, тварина, елемент, полярність",
    "стовп місяця за сонячним терміном (Цзєці)",
    "стовп дня за безперервним 60-денним циклом",
    "елемент і полярність кожного стовбура",
  ],
  limits: [
    "стовп години — потрібен час народження; без нього ми його не вигадуємо",
    "приховані стовбури в гілках і сила елементів — окремий аналіз, тут його немає",
    "межа дня береться за календарною датою, без переходу на місцевий сонячний час",
  ],
  source:
    "Сонячний календар Цзєці (Лічунь = 315° довготи Сонця); 60-річний цикл Ґань-Чжі; день — (JDN + 49) mod 60, перевірено на 2000-01-01 = 戊午.",
};

/** Один стовп: стовбур, гілка й те, що з них видно. */
export interface Pillar {
  readonly stem: string;
  readonly branch: string;
  /** Стовбур і гілка разом: «Ґен-Шень». */
  readonly label: string;
  readonly element: string;
  readonly polarity: string;
  /** Тварина гілки для року; для місяця й дня — сезонна назва. */
  readonly animal: string;
  /** Індекс гілки 0…11 — за ним беруться правила місяця й дня. */
  readonly branchIndex: number;
}

/** Канонічний профіль трьох стовпів. */
export interface ChineseProfile {
  readonly date: string;
  readonly solarLongitude: number;
  /** Сонячний термін, у якому лежить дата. */
  readonly solarTerm: string;
  /** Сонячний рік за Лічунем — він же рік стовпа. */
  readonly solarYear: number;
  readonly year: Pillar;
  readonly month: Pillar;
  readonly day: Pillar;
  /** Місяць від Лічуню: 1 — Тигр … 12 — Бик. */
  readonly monthIndex: number;
}

interface StemRow {
  readonly name: string;
  readonly sign: string;
  readonly element: string;
  readonly polarity: string;
}

interface BranchRow {
  readonly name: string;
  readonly sign: string;
  readonly animal: string;
  readonly element: string;
  readonly polarity: string;
}

const STEMS: readonly StemRow[] = [
  { name: "Цзя", sign: "甲", element: "Дерево", polarity: "ян" },
  { name: "Ї", sign: "乙", element: "Дерево", polarity: "їнь" },
  { name: "Бін", sign: "丙", element: "Вогонь", polarity: "ян" },
  { name: "Дін", sign: "丁", element: "Вогонь", polarity: "їнь" },
  { name: "У", sign: "戊", element: "Земля", polarity: "ян" },
  { name: "Цзі", sign: "己", element: "Земля", polarity: "їнь" },
  { name: "Ґен", sign: "庚", element: "Метал", polarity: "ян" },
  { name: "Сінь", sign: "辛", element: "Метал", polarity: "їнь" },
  { name: "Жень", sign: "壬", element: "Вода", polarity: "ян" },
  { name: "Ґуй", sign: "癸", element: "Вода", polarity: "їнь" },
];

const BRANCHES: readonly BranchRow[] = [
  { name: "Цзи", sign: "子", animal: "Щур", element: "Вода", polarity: "ян" },
  { name: "Чоу", sign: "丑", animal: "Бик", element: "Земля", polarity: "їнь" },
  { name: "Інь", sign: "寅", animal: "Тигр", element: "Дерево", polarity: "ян" },
  { name: "Мао", sign: "卯", animal: "Кріль", element: "Дерево", polarity: "їнь" },
  { name: "Чень", sign: "辰", animal: "Дракон", element: "Земля", polarity: "ян" },
  { name: "Сі", sign: "巳", animal: "Змія", element: "Вогонь", polarity: "їнь" },
  { name: "У", sign: "午", animal: "Кінь", element: "Вогонь", polarity: "ян" },
  { name: "Вей", sign: "未", animal: "Коза", element: "Земля", polarity: "їнь" },
  { name: "Шень", sign: "申", animal: "Мавпа", element: "Метал", polarity: "ян" },
  { name: "Ю", sign: "酉", animal: "Півень", element: "Метал", polarity: "їнь" },
  { name: "Сюй", sign: "戌", animal: "Собака", element: "Земля", polarity: "ян" },
  { name: "Хай", sign: "亥", animal: "Свиня", element: "Вода", polarity: "їнь" },
];

/** Дванадцять місяців від Лічуню: термін, гілка й назва сезону. */
export const SOLAR_MONTHS: readonly { term: string; branch: number }[] = [
  { term: "Лі Чунь", branch: 2 },
  { term: "Цзін Чже", branch: 3 },
  { term: "Цін Мін", branch: 4 },
  { term: "Лі Ся", branch: 5 },
  { term: "Ман Чжун", branch: 6 },
  { term: "Сяо Шу", branch: 7 },
  { term: "Лі Цю", branch: 8 },
  { term: "Бай Лу", branch: 9 },
  { term: "Хань Лу", branch: 10 },
  { term: "Лі Дун", branch: 11 },
  { term: "Да Сюе", branch: 0 },
  { term: "Сяо Хань", branch: 1 },
];

/** Родовий відмінок тварини для доказу: «Рік Мавпи», а не «Рік Мавпа». */
const ANIMAL_GENITIVE: Readonly<Record<string, string>> = {
  Щур: "Щура",
  Бик: "Бика",
  Тигр: "Тигра",
  Кріль: "Кроля",
  Дракон: "Дракона",
  Змія: "Змії",
  Кінь: "Коня",
  Коза: "Кози",
  Мавпа: "Мавпи",
  Півень: "Півня",
  Собака: "Собаки",
  Свиня: "Свині",
};

const BY_ANIMAL: Readonly<Record<string, readonly LensRule[]>> = {
  Щур: [
    { qualityId: "analysis", level: 4, note: "розкладає задачу на частини" },
    { qualityId: "learning", level: 4, note: "шукає, чого не знає" },
    { qualityId: "openness", level: 3, note: "пробує нове в звичних межах" },
  ],
  Бик: [
    { qualityId: "discipline", level: 4, note: "робить потрібне щодня" },
    { qualityId: "endurance", level: 4, note: "довга дистанція без падіння" },
    { qualityId: "honesty", level: 4, note: "тримає слово" },
  ],
  Тигр: [
    { qualityId: "initiative", level: 4, note: "створює рух там, де не просили" },
    { qualityId: "leadership", level: 4, note: "бере відповідальність за групу" },
    { qualityId: "playfulness", level: 3, note: "міняє правила гри" },
  ],
  Кріль: [
    { qualityId: "care", level: 4, note: "помічає потребу без нагадування" },
    { qualityId: "empathy", level: 4, note: "підбирає слова під стан" },
    { qualityId: "aesthetics", level: 3, note: "має смак у своїй сфері" },
  ],
  Дракон: [
    { qualityId: "leadership", level: 4, note: "у кризі стає точкою опори" },
    { qualityId: "purposefulness", level: 4, note: "тримає напрям роками" },
    { qualityId: "imagination", level: 3, note: "бачить хід, якого не бачили" },
  ],
  Змія: [
    { qualityId: "analysis", level: 4, note: "перевіряє припущення" },
    { qualityId: "focus", level: 4, note: "годинами лишається в одній задачі" },
    { qualityId: "persuasion", level: 3, note: "знаходить аргумент під співрозмовника" },
  ],
  Кінь: [
    { qualityId: "openness", level: 4, note: "іде в незнайоме першим" },
    { qualityId: "extraversion", level: 4, note: "легко знайомиться" },
    { qualityId: "tempo", level: 3, note: "рішення й рух майже одночасно" },
  ],
  Коза: [
    { qualityId: "aesthetics", level: 4, note: "бачить форму як аргумент" },
    { qualityId: "care", level: 4, note: "бере на себе більше, ніж просять" },
    { qualityId: "imagination", level: 3, note: "пропонує кілька варіантів" },
  ],
  Мавпа: [
    { qualityId: "learning", level: 4, note: "міняє підхід після невдачі" },
    { qualityId: "enterprise", level: 4, note: "бачить можливість раніше за інших" },
    { qualityId: "playfulness", level: 3, note: "гра — спосіб думати" },
    { qualityId: "discipline", level: 2, note: "починає багато, не доводить" },
  ],
  Півень: [
    { qualityId: "precision", level: 4, note: "перевіряє роботу перед здачею" },
    { qualityId: "discipline", level: 4, note: "тримає власний ритм" },
    { qualityId: "honesty", level: 3, note: "каже незручну правду" },
  ],
  Собака: [
    { qualityId: "honesty", level: 4, note: "платить ціну за правду" },
    { qualityId: "cooperation", level: 4, note: "тримає чужу частину в полі зору" },
    { qualityId: "care", level: 3, note: "допомагає без нагадування" },
  ],
  Свиня: [
    { qualityId: "honesty", level: 4, note: "тримає слово" },
    { qualityId: "care", level: 4, note: "тримає чужу потребу в полі зору" },
    { qualityId: "empathy", level: 3, note: "помічає зміну настрою" },
  ],
};

/** Стихія року: те, що рік додає до тварини. */
const BY_YEAR_ELEMENT: Readonly<Record<string, LensRule>> = {
  Дерево: { qualityId: "learning", level: 3, note: "рік росту й навчання" },
  Вогонь: { qualityId: "extraversion", level: 3, note: "рік прояву назовні" },
  Земля: { qualityId: "discipline", level: 3, note: "рік опори й праці" },
  Метал: { qualityId: "precision", level: 3, note: "рік точності й меж" },
  Вода: { qualityId: "empathy", level: 3, note: "рік чутливості й течії" },
};

const BY_POLARITY: Readonly<Record<string, LensRule>> = {
  ян: { qualityId: "initiative", level: 3, note: "ян додає зовнішнього руху" },
  їнь: { qualityId: "listening", level: 3, note: "їнь додає сприйняття" },
};

/** Місяць як сезон: кожна гілка має власну тему. */
const BY_MONTH: Readonly<Record<number, LensRule>> = {
  2: { qualityId: "initiative", level: 3, note: "місяць Тигра: старт" },
  3: { qualityId: "care", level: 3, note: "місяць Кроля: м'якість" },
  4: { qualityId: "verbal", level: 3, note: "місяць Дракона: прояв" },
  5: { qualityId: "extraversion", level: 3, note: "місяць Змії: контакт" },
  6: { qualityId: "leadership", level: 3, note: "місяць Коня: рух уперед" },
  7: { qualityId: "care", level: 3, note: "місяць Кози: підтримка" },
  8: { qualityId: "precision", level: 3, note: "місяць Мавпи: точність" },
  9: { qualityId: "honesty", level: 3, note: "місяць Півня: прямота" },
  10: { qualityId: "cooperation", level: 3, note: "місяць Собаки: вірність" },
  11: { qualityId: "openness", level: 3, note: "місяць Свині: прийняття" },
  0: { qualityId: "analysis", level: 3, note: "місяць Щура: розбір" },
  1: { qualityId: "endurance", level: 3, note: "місяць Бика: витримка" },
};

/** День: стовбур задає спосіб дії, гілка — спосіб триматися. */
const BY_DAY_ELEMENT: Readonly<Record<string, LensRule>> = {
  Дерево: { qualityId: "learning", level: 3, note: "день дерева: ріст через досвід" },
  Вогонь: { qualityId: "verbal", level: 3, note: "день вогню: слово й тепло" },
  Земля: { qualityId: "organization", level: 3, note: "день землі: порядок" },
  Метал: { qualityId: "precision", level: 3, note: "день металу: точність" },
  Вода: { qualityId: "empathy", level: 3, note: "день води: чутливість" },
};

const BY_DAY_BRANCH: Readonly<Record<number, LensRule>> = {
  0: { qualityId: "focus", level: 3, note: "день Щура: нічна робота" },
  1: { qualityId: "endurance", level: 3, note: "день Бика: довгий подих" },
  2: { qualityId: "initiative", level: 3, note: "день Тигра: перший крок" },
  3: { qualityId: "listening", level: 3, note: "день Кроля: тиша й увага" },
  4: { qualityId: "leadership", level: 3, note: "день Дракона: масштаб" },
  5: { qualityId: "persuasion", level: 3, note: "день Змії: вплив словом" },
  6: { qualityId: "tempo", level: 3, note: "день Коня: швидкість" },
  7: { qualityId: "care", level: 3, note: "день Кози: турбота" },
  8: { qualityId: "enterprise", level: 3, note: "день Мавпи: винахідливість" },
  9: { qualityId: "honesty", level: 3, note: "день Півня: прямота" },
  10: { qualityId: "cooperation", level: 3, note: "день Собаки: вірність" },
  11: { qualityId: "openness", level: 3, note: "день Свині: прийняття" },
};

const BY_BRANCH: Readonly<Record<number, BranchRow>> = Object.fromEntries(
  BRANCHES.map((row, index) => [index, row]),
);

export const CHINESE_ANIMALS: readonly string[] = BRANCHES.map((row) => row.animal);

/** Гілка за індексом — сервер бере його з канонічного стовпа. */
export function chineseBranch(index: number): BranchRow | null {
  return BY_BRANCH[index] ?? null;
}

/** Стовбур за індексом; окремо, бо місячний стовбур рахується правилом П'яти тигрів. */
export function chineseStem(index: number): StemRow | null {
  return STEMS[index] ?? null;
}

function claim(
  profile: ChineseProfile,
  rule: LensRule,
  evidence: string,
  details: readonly string[],
): QualityClaim {
  return makeClaim({
    qualityId: rule.qualityId,
    level: rule.level,
    layer: "symbolic",
    sourceId: CHINESE.id,
    sourceVersion: CHINESE.version,
    method: "mapped",
    evidence: `${evidence}: ${rule.note}`,
    details: [
      `Дата: ${profile.date}`,
      `Сонячний термін: ${profile.solarTerm}; Сонце ${profile.solarLongitude.toFixed(2)}°.`,
      ...details,
    ],
  });
}

/**
 * Свідчення трьох стовпів. День, місяць і рік кажуть про різні речі; якщо
 * якість повторюється, лишається сильніше свідчення, а не два однакові.
 */
export function chineseClaims(profile: ChineseProfile): readonly QualityClaim[] {
  const claims: QualityClaim[] = [];
  const yearAnimal = BY_ANIMAL[profile.year.animal];
  if (!yearAnimal) {
    throw new Error(`Тварини «${profile.year.animal}» немає в таблиці китайської системи.`);
  }
  const animalIn = ANIMAL_GENITIVE[profile.year.animal] ?? profile.year.animal;
  const yearLine = `Рік: ${profile.year.label} (${profile.year.stem} / ${profile.year.branch}), ${profile.year.element}, ${profile.year.polarity}, тварина ${profile.year.animal}`;
  for (const rule of yearAnimal) {
    claims.push(
      claim(profile, rule, `Рік ${animalIn}`, [
        yearLine,
        `Правило: тварина року дає «${rule.note}» → рівень ${rule.level}.`,
      ]),
    );
  }

  const yearElement = BY_YEAR_ELEMENT[profile.year.element];
  if (yearElement) {
    claims.push(
      claim(profile, yearElement, `Стихія року ${profile.year.element}`, [
        yearLine,
        `Правило: стихія року дає «${yearElement.note}» → рівень ${yearElement.level}.`,
      ]),
    );
  }
  const polarity = BY_POLARITY[profile.year.polarity];
  if (polarity) {
    claims.push(
      claim(profile, polarity, `Полярність року ${profile.year.polarity}`, [
        yearLine,
        `Правило: полярність дає «${polarity.note}» → рівень ${polarity.level}.`,
      ]),
    );
  }

  const monthRule = BY_MONTH[profile.month.branchIndex];
  if (monthRule) {
    claims.push(
      claim(
        profile,
        monthRule,
        `Місяць ${ANIMAL_GENITIVE[profile.month.animal] ?? profile.month.animal}`,
        [
          `Місячний стовп: ${profile.month.label}, ${profile.month.element}, ${profile.month.polarity}.`,
          `Сонячний термін: ${profile.solarTerm}; Сонце ${profile.solarLongitude.toFixed(2)}°.`,
          `Правило: ${monthRule.note} → рівень ${monthRule.level}.`,
        ],
      ),
    );
  }

  const dayElement = BY_DAY_ELEMENT[profile.day.element];
  if (dayElement) {
    claims.push(
      claim(profile, dayElement, `День ${profile.day.label}`, [
        `Денний стовп: ${profile.day.label} (${profile.day.stem} / ${profile.day.branch}), ${profile.day.element}, ${profile.day.polarity}.`,
        `Правило: ${dayElement.note} → рівень ${dayElement.level}.`,
      ]),
    );
  }
  const dayBranch = BY_DAY_BRANCH[profile.day.branchIndex];
  if (dayBranch) {
    claims.push(
      claim(profile, dayBranch, `Гілка дня ${profile.day.branch}`, [
        `Гілка дня: ${profile.day.branch} (${profile.day.animal}).`,
        `Правило: ${dayBranch.note} → рівень ${dayBranch.level}.`,
      ]),
    );
  }

  return strongestPerQuality(claims);
}
