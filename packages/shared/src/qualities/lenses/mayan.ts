/**
 * Маянський Цолькін: день і тон → свідчення. День рахує сервер за кореляцією
 * GMT 584283, таблицю тримає лінза; довга лічба й пророцтва сюди не входять.
 *
 * @module @wwwuabot/shared/qualities/lenses/mayan
 */

import { claimsOf, type LensRule } from "./rule";
import type { LensDefinition, QualityClaim } from "../types";

/** Лінза як дані: версія, шар, входи. */
export const MAYAN: LensDefinition = {
  id: "mayan",
  name: "Маянський Цолькін",
  version: "1",
  layer: "symbolic",
  inputs: ["date"],
  rule: "день і тон Цолькіна",
};

interface DayRow {
  readonly name: string;
  readonly rules: readonly LensRule[];
}

/** Двадцять печаток у порядку Цолькіна; індекс — (днів від епохи + 19) % 20. */
const TABLE: readonly DayRow[] = [
  {
    name: "Іміш",
    rules: [
      { qualityId: "care", level: 4, note: "помічає потребу" },
      { qualityId: "vitality", level: 4, note: "енергії більше, ніж планів" },
      { qualityId: "imagination", level: 3, note: "пропонує кілька варіантів" },
    ],
  },
  {
    name: "Ік",
    rules: [
      { qualityId: "verbal", level: 4, note: "слово дається легко" },
      { qualityId: "openness", level: 4, note: "іде в незнайоме першим" },
      { qualityId: "tempo", level: 3, note: "перемикається швидко" },
    ],
  },
  {
    name: "Акбаль",
    rules: [
      { qualityId: "analysis", level: 4, note: "перевіряє припущення" },
      { qualityId: "focus", level: 4, note: "глибока робота без нагадувань" },
      { qualityId: "imagination", level: 3, note: "бачить варіанти поза наявним" },
    ],
  },
  {
    name: "Кан",
    rules: [
      { qualityId: "learning", level: 4, note: "засвоює нове з практики" },
      { qualityId: "purposefulness", level: 4, note: "тримає ціль, коли стає важко" },
      { qualityId: "care", level: 3, note: "допомагає без нагадування" },
    ],
  },
  {
    name: "Чикчан",
    rules: [
      { qualityId: "vitality", level: 4, note: "легко бере додаткове" },
      { qualityId: "persuasion", level: 4, note: "веде за собою без наказу" },
      { qualityId: "focus", level: 3, note: "годинами лишається в задачі" },
    ],
  },
  {
    name: "Кімі",
    rules: [
      { qualityId: "honesty", level: 4, note: "каже незручну правду" },
      { qualityId: "stressResilience", level: 4, note: "під тиском діє спокійніше" },
      { qualityId: "openness", level: 3, note: "пробує нове в звичних межах" },
    ],
  },
  {
    name: "Манік",
    rules: [
      { qualityId: "care", level: 4, note: "тримає чужу потребу в полі зору" },
      { qualityId: "empathy", level: 4, note: "чує і те, що не сказано" },
      { qualityId: "precision", level: 3, note: "звіряє ключові числа" },
    ],
  },
  {
    name: "Ламат",
    rules: [
      { qualityId: "aesthetics", level: 4, note: "бачить форму як аргумент" },
      { qualityId: "imagination", level: 4, note: "бачить нестандартний хід" },
      { qualityId: "playfulness", level: 3, note: "гра — спосіб думати" },
    ],
  },
  {
    name: "Мулук",
    rules: [
      { qualityId: "empathy", level: 4, note: "підбирає слова під стан" },
      { qualityId: "care", level: 4, note: "бере на себе більше, ніж просять" },
      { qualityId: "stressResilience", level: 3, note: "відновлюється після збою" },
    ],
  },
  {
    name: "Ок",
    rules: [
      { qualityId: "honesty", level: 4, note: "тримає слово" },
      { qualityId: "cooperation", level: 4, note: "домовляється про ролі" },
      { qualityId: "listening", level: 3, note: "переказує почуте так, що впізнають" },
    ],
  },
  {
    name: "Чуен",
    rules: [
      { qualityId: "playfulness", level: 4, note: "міняє правила гри" },
      { qualityId: "verbal", level: 4, note: "говорить так, що слухають" },
      { qualityId: "enterprise", level: 3, note: "пробує мале без великого ризику" },
    ],
  },
  {
    name: "Еб",
    rules: [
      { qualityId: "purposefulness", level: 4, note: "повертається до цілі після збою" },
      { qualityId: "planning", level: 4, note: "планує наперед і тримає запас" },
      { qualityId: "cooperation", level: 3, note: "тримає свою частину" },
    ],
  },
  {
    name: "Бен",
    rules: [
      { qualityId: "leadership", level: 4, note: "веде за собою добровільно" },
      { qualityId: "purposefulness", level: 4, note: "тримає напрям роками" },
      { qualityId: "verbal", level: 3, note: "легко формулює думку" },
    ],
  },
  {
    name: "Іш",
    rules: [
      { qualityId: "analysis", level: 4, note: "перевіряє припущення" },
      { qualityId: "focus", level: 4, note: "не помічає часу в роботі" },
      { qualityId: "precision", level: 3, note: "ловить невідповідність" },
    ],
  },
  {
    name: "Мен",
    rules: [
      { qualityId: "abstraction", level: 4, note: "будує модель і переносить її" },
      { qualityId: "planning", level: 4, note: "бачить послідовність на місяці" },
      { qualityId: "leadership", level: 3, note: "бере відповідальність за результат" },
    ],
  },
  {
    name: "Кіб",
    rules: [
      { qualityId: "honesty", level: 4, note: "платить ціну за правду" },
      { qualityId: "analysis", level: 4, note: "називає ціну помилки" },
      { qualityId: "listening", level: 3, note: "чує зміст і стан" },
    ],
  },
  {
    name: "Кабан",
    rules: [
      { qualityId: "organization", level: 4, note: "система працює без нагадувань" },
      { qualityId: "discipline", level: 4, note: "робить потрібне щодня" },
      { qualityId: "planning", level: 3, note: "тримає запас на збої" },
    ],
  },
  {
    name: "Ецнаб",
    rules: [
      { qualityId: "precision", level: 4, note: "бачить невідповідність" },
      { qualityId: "honesty", level: 4, note: "каже правду, коли це дорого" },
      { qualityId: "analysis", level: 3, note: "перевіряє дані" },
    ],
  },
  {
    name: "Кауак",
    rules: [
      { qualityId: "stressResilience", level: 4, note: "зберігає ясність у кризі" },
      { qualityId: "vitality", level: 4, note: "енергії більше, ніж планів" },
      { qualityId: "initiative", level: 3, note: "береться за невизначене" },
    ],
  },
  {
    name: "Ахау",
    rules: [
      { qualityId: "leadership", level: 4, note: "у кризі стає точкою опори" },
      { qualityId: "empathy", level: 4, note: "тримає чужі межі й свої" },
      { qualityId: "purposefulness", level: 3, note: "тримає напрям" },
    ],
  },
];

const BY_NAME = new Map(TABLE.map((row) => [row.name, row]));

/** Печатки в порядку Цолькіна — з нього сервер бере індекс дня. */
export const MAYAN_DAY_SIGNS: readonly string[] = TABLE.map((row) => row.name);

/** Свідчення для дня Цолькіна; тон входить у доказ, але не множить рівень. */
export function mayanClaims(daySign: string, tone: number): readonly QualityClaim[] {
  const row = BY_NAME.get(daySign);
  if (!row) {
    throw new Error(`Печатки «${daySign}» немає в таблиці Цолькіна — рівень не вигадуємо.`);
  }
  if (!Number.isInteger(tone) || tone < 1 || tone > 13) {
    throw new Error(`Тон Цолькіна ${tone} поза шкалою 1…13.`);
  }
  return claimsOf(MAYAN, `День Цолькіна ${tone} ${row.name}`, row.rules);
}
