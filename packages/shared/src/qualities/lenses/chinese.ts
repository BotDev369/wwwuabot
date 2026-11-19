/**
 * Китайська лінза: тварина року за Лічунем → свідчення. Рік рахує сервер,
 * таблицю тримає лінза; стихія й години сюди не входять — для них потрібен час.
 *
 * @module @wwwuabot/shared/qualities/lenses/chinese
 */

import { claimsOf, type LensRule } from "./rule";
import type { LensDefinition, QualityClaim } from "../types";

/** Лінза як дані: версія, шар, входи. */
export const CHINESE: LensDefinition = {
  id: "chinese",
  name: "Китайська традиція",
  version: "1",
  layer: "symbolic",
  inputs: ["date"],
  rule: "тварина року за Лічунем",
  about:
    "Китайська традиція читає рік народження як пару «тварина + стихія». " +
    "Рік змінюється не 1 січня, а на Лічунь — початок весни за сонячним календарем (4 лютого).",
  gives: ["тварину року", "межу року за Лічунем"],
  limits: [
    "стовпи місяця, дня й години — окремий розрахунок, тут його ще немає",
    "без часу народження немає годинного стовпа",
  ],
  source: "Китайський сонячний календар; межа року — Лічунь (≈4 лютого).",
};

interface AnimalRow {
  readonly name: string;
  /** Родовий відмінок для доказу: «Рік Мавпи», а не «Рік Мавпа». */
  readonly inYear: string;
  readonly rules: readonly LensRule[];
}

/** Дванадцять тварин у циклі від Щура; індекс збігається з (рік − 4) % 12. */
const TABLE: readonly AnimalRow[] = [
  {
    name: "Щур",
    inYear: "Щура",
    rules: [
      { qualityId: "analysis", level: 4, note: "розкладає задачу на частини" },
      { qualityId: "learning", level: 4, note: "шукає, чого не знає" },
      { qualityId: "openness", level: 3, note: "пробує нове в звичних межах" },
    ],
  },
  {
    name: "Бик",
    inYear: "Бика",
    rules: [
      { qualityId: "discipline", level: 4, note: "робить потрібне щодня" },
      { qualityId: "endurance", level: 4, note: "довга дистанція без падіння" },
      { qualityId: "honesty", level: 4, note: "тримає слово" },
    ],
  },
  {
    name: "Тигр",
    inYear: "Тигра",
    rules: [
      { qualityId: "initiative", level: 4, note: "створює рух там, де не просили" },
      { qualityId: "leadership", level: 4, note: "бере відповідальність за групу" },
      { qualityId: "playfulness", level: 3, note: "міняє правила гри" },
    ],
  },
  {
    name: "Кріль",
    inYear: "Кроля",
    rules: [
      { qualityId: "care", level: 4, note: "помічає потребу без нагадування" },
      { qualityId: "empathy", level: 4, note: "підбирає слова під стан" },
      { qualityId: "aesthetics", level: 3, note: "має смак у своїй сфері" },
    ],
  },
  {
    name: "Дракон",
    inYear: "Дракона",
    rules: [
      { qualityId: "leadership", level: 4, note: "у кризі стає точкою опори" },
      { qualityId: "purposefulness", level: 4, note: "тримає напрям роками" },
      { qualityId: "imagination", level: 3, note: "бачить хід, якого не бачили" },
    ],
  },
  {
    name: "Змія",
    inYear: "Змії",
    rules: [
      { qualityId: "analysis", level: 4, note: "перевіряє припущення" },
      { qualityId: "focus", level: 4, note: "годинами лишається в одній задачі" },
      { qualityId: "persuasion", level: 3, note: "знаходить аргумент під співрозмовника" },
    ],
  },
  {
    name: "Кінь",
    inYear: "Коня",
    rules: [
      { qualityId: "openness", level: 4, note: "іде в незнайоме першим" },
      { qualityId: "extraversion", level: 4, note: "легко знайомиться" },
      { qualityId: "tempo", level: 3, note: "рішення й рух майже одночасно" },
    ],
  },
  {
    name: "Коза",
    inYear: "Кози",
    rules: [
      { qualityId: "aesthetics", level: 4, note: "бачить форму як аргумент" },
      { qualityId: "care", level: 4, note: "бере на себе більше, ніж просять" },
      { qualityId: "imagination", level: 3, note: "пропонує кілька варіантів" },
    ],
  },
  {
    name: "Мавпа",
    inYear: "Мавпи",
    rules: [
      { qualityId: "learning", level: 4, note: "міняє підхід після невдачі" },
      { qualityId: "enterprise", level: 4, note: "бачить можливість раніше за інших" },
      { qualityId: "playfulness", level: 3, note: "гра — спосіб думати" },
      { qualityId: "discipline", level: 2, note: "починає багато, не доводить" },
    ],
  },
  {
    name: "Півень",
    inYear: "Півня",
    rules: [
      { qualityId: "precision", level: 4, note: "перевіряє роботу перед здачею" },
      { qualityId: "discipline", level: 4, note: "тримає власний ритм" },
      { qualityId: "honesty", level: 3, note: "каже незручну правду" },
    ],
  },
  {
    name: "Собака",
    inYear: "Собаки",
    rules: [
      { qualityId: "honesty", level: 4, note: "платить ціну за правду" },
      { qualityId: "cooperation", level: 4, note: "тримає чужу частину в полі зору" },
      { qualityId: "care", level: 3, note: "допомагає без нагадування" },
    ],
  },
  {
    name: "Свиня",
    inYear: "Свині",
    rules: [
      { qualityId: "honesty", level: 4, note: "тримає слово" },
      { qualityId: "care", level: 4, note: "тримає чужу потребу в полі зору" },
      { qualityId: "empathy", level: 3, note: "помічає зміну настрою" },
    ],
  },
];

const BY_NAME = new Map(TABLE.map((row) => [row.name, row]));

/** Тварини в порядку циклу — з нього сервер бере індекс року. */
export const CHINESE_ANIMALS: readonly string[] = TABLE.map((row) => row.name);

/** Свідчення для тварини року; невідома тварина — помилка, не «середнє». */
export function chineseClaims(animal: string): readonly QualityClaim[] {
  const row = BY_NAME.get(animal);
  if (!row) {
    throw new Error(`Тварини «${animal}» немає в таблиці китайської лінзи — рівень не вигадуємо.`);
  }
  return claimsOf(CHINESE, `Рік ${row.inYear} за Лічунем`, row.rules);
}
