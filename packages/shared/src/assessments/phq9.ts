/**
 * PHQ-9 — опитувальник здоров'я пацієнта, дев'ять питань.
 *
 * **Дані, а не логіка.** Бал рахує `scoreAssessment`, прапорці — `flags.ts`, а
 * всі тексти лежать у `phq9_texts.ts`. Тому специфікацію можна оновити
 * (`specs/phq9-gad7/`), не торкаючись розрахунку.
 *
 * **Питання 9 — питання безпеки.** Воно позначене `safety: true`, і будь-яка
 * відповідь вище нуля запускає протокол допомоги **незалежно від суми**.
 * Людина з 2 балами з 27 отримує той самий блок, що й з 20. Тому прапор не
 * виводиться зі смуг, а з відповіді — див. `flags.ts`.
 *
 * Джерело: `specs/phq9-gad7/02-instruments.md` (§4, §6), `03-safety.md` (§8).
 *
 * @module @wwwuabot/shared/assessments/phq9
 */

import type { AssessmentItem, AssessmentTest, HelpLine, ScaleOption } from "./types";
import {
  PHQ9_ABOUT,
  PHQ9_BAND_NOTES,
  PHQ9_IMPACT_TEXTS,
  PHQ9_ITEM_ALERTS,
  PHQ9_SAFETY_HIGH,
  PHQ9_SAFETY_LOW,
} from "./phq9_texts";

/** Шкала одна для всіх дев'яти питань і для питання про вплив. */
const OPTIONS: readonly ScaleOption[] = [
  { value: 0, label: "Зовсім ні" },
  { value: 1, label: "Кілька днів" },
  { value: 2, label: "Більше половини днів" },
  { value: 3, label: "Майже щодня" },
];

const IMPACT_OPTIONS: readonly ScaleOption[] = [
  { value: 0, label: "Зовсім не ускладнили" },
  { value: 1, label: "Певною мірою ускладнили" },
  { value: 2, label: "Дуже ускладнили" },
  { value: 3, label: "Надзвичайно ускладнили" },
];

/**
 * Дев'ять питань + питання про вплив (останнє не входить у суму).
 *
 * `alertAtLeast: 2` — з §6.4: відповідь «більше половини днів» і частіше
 * показує персональний акцент саме цього питання.
 */
const ITEMS: readonly AssessmentItem[] = [
  {
    id: "interest",
    text: "Малий інтерес або відсутність задоволення від того, що ви робите",
    label: "Інтерес",
    alertAtLeast: 2,
  },
  {
    id: "mood",
    text: "Поганий настрій, пригніченість або відчуття безнадійності",
    label: "Настрій",
    alertAtLeast: 2,
  },
  {
    id: "sleep",
    text: "Проблеми зі сном: важко заснути, часто прокидаєтеся вночі або, навпаки, спите надто багато",
    label: "Сон",
    alertAtLeast: 2,
  },
  {
    id: "energy",
    text: "Втома або відчуття браку енергії",
    label: "Енергія",
    alertAtLeast: 2,
  },
  {
    id: "appetite",
    text: "Поганий апетит або переїдання",
    label: "Апетит",
    alertAtLeast: 2,
  },
  {
    id: "selfworth",
    text: "Погане ставлення до себе: відчуття, що ви невдаха або підвели себе чи свою родину",
    label: "Самооцінка",
    alertAtLeast: 2,
  },
  {
    id: "concentration",
    text: "Труднощі з концентрацією уваги, наприклад, під час читання чи перегляду телевізора",
    label: "Концентрація",
    alertAtLeast: 2,
  },
  {
    id: "psychomotor",
    text: "Настільки повільні рухи або мовлення, що інші могли це помітити. Або навпаки, настільки виражений неспокій, що ви рухалися значно більше, ніж зазвичай",
    label: "Темп рухів",
    alertAtLeast: 2,
  },
  {
    id: "harm",
    text: "Думки про те, що вам краще було б померти, або про те, щоб якимось чином завдати собі шкоди",
    label: "Думки про смерть",
    safety: true,
    // `alertAtLeast` навмисно НЕ задано: це питання обробляється протоколом
    // безпеки, а не персональним акцентом у списку (§7.6 каже «див. розділ 8»).
  },
  {
    id: "impact",
    text: "Якщо ви позначили будь-яку з проблем вище, наскільки вони ускладнили вам роботу, ведення домашніх справ або спілкування з іншими людьми?",
    label: "Вплив на життя",
    countsTowardScore: false,
  },
];

/** Рівні за §6.1 — межі опубліковані, разом із чутливістю 88% на межі 10. */
const BANDS = [
  { key: "phq_minimal", min: 0, max: 4, label: "Мінімальні симптоми" },
  { key: "phq_mild", min: 5, max: 9, label: "Легкі симптоми" },
  { key: "phq_moderate", min: 10, max: 14, label: "Помірні симптоми" },
  { key: "phq_modsevere", min: 15, max: 19, label: "Значно виражені симптоми" },
  { key: "phq_severe", min: 20, max: 27, label: "Тяжкі симптоми" },
] as const;

/**
 * Лінії допомоги (§8.4). **Це дані, а не константи в логіці**, і вони
 * редагуються без зміни коду — специфікація прямо вимагає перевірити
 * актуальність перед запуском.
 */
const HELP_LINES: readonly HelpLine[] = [
  {
    name: "Екстрена допомога",
    number: "112",
    note: "Цілодобово, якщо є безпосередня загроза життю",
    primary: true,
  },
  {
    name: "Lifeline Ukraine",
    number: "7333",
    note: "Цілодобово, безкоштовно, анонімно",
    primary: true,
  },
  {
    name: "Ла Страда-Україна",
    number: "116 123",
    note: "З мобільного. Цілодобово, безкоштовно",
    primary: true,
  },
  { name: "Урядова гаряча лінія", number: "1545", note: "Цілодобово" },
  { name: "Лінія «Людина в біді»", number: "0 800 210 160", note: "Цілодобово" },
  {
    name: "Лінія емоційної підтримки",
    number: "0 800 211 444",
    note: "Щодня, 10:00–20:00, безкоштовно",
  },
  {
    name: "Національна психологічна асоціація",
    number: "0 800 100 102",
    note: "Щодня, 10:00–20:00, безкоштовно",
  },
  { name: "Лінія з питань домашнього насильства", number: "1547", note: "Цілодобово" },
];

export const PHQ_9: AssessmentTest = {
  key: "phq9",
  title: "Настрій і депресія",
  lead: "Дев'ять запитань про останні два тижні й одне про вплив на життя. Близько трьох хвилин.",
  about: PHQ9_ABOUT,
  periodLabel: "Упродовж останніх двох тижнів",
  // Акценти й тексти протоколу підставляються тут, щоб `ITEMS` лишався
  // чистим описом питань: питання і його пояснення в одному місці розійшлися б
  // з першою ж перестановкою.
  items: ITEMS.map((item) => ({
    ...item,
    alertNote: item.safety ? undefined : PHQ9_ITEM_ALERTS[item.id],
    safetyTexts: item.safety
      ? { 1: PHQ9_SAFETY_LOW, 2: PHQ9_SAFETY_HIGH, 3: PHQ9_SAFETY_HIGH }
      : undefined,
  })),
  options: OPTIONS,
  bands: BANDS.map((band) => ({ ...band, note: PHQ9_BAND_NOTES[band.key] })),
  attentionBelow: 10,
  significantChange: { kind: "points", value: 5 },
  disclaimerInline: true,
  disclaimer:
    "Це скринінговий інструмент, а не діагноз. Він не встановлює причину: діагноз ставить лише кваліфікований фахівцеві на основі бесіди та обстеження.",
  help: HELP_LINES,
  impact: {
    prompt: "Якщо ви позначили будь-яку з проблем вище, наскільки вони ускладнили вам життя?",
    options: IMPACT_OPTIONS,
    texts: PHQ9_IMPACT_TEXTS,
  },
  combinedGroup: "phq9-gad7",
  source: {
    name: "PHQ-9, розроблено Pfizer Inc.",
    citation:
      "Spitzer R. L., Kroenke K., Williams J. B. W. The PHQ-9: validity of a brief depression severity measure. Journal of General Internal Medicine, 2001. Дозвіл на відтворення, переклад і поширення не потрібен.",
    url: "https://www.phqscreeners.com/",
    license: "No permission required to reproduce, translate, display or distribute",
  },
};
