/**
 * «Тревожність і депресія» — **один тест із двома шкалами**, PHQ-9 і GAD-7.
 *
 * **Чому один, а не два.** Це два прояви одного стану, і вони майже ніколи не
 * приходять по одному: тривога тягне за собою пригніченість, а знижений настрій
 * піднімає тривогу. Раніше це були два тести з двома проходженнями, двома
 * картками в списку й двома рядками в базі — і людина, яка хоче зрозуміти
 * «як я себе почуваю», мусила сама вирішувати, який із двох їй важливіший.
 * Одне проходження з двома блоками дає те саме знання й одну відповідь.
 *
 * **Смуги, поріг і напрямок живуть у шкалі** (`scales.ts`), а не в тесті:
 * інакше другий блок приречений на власний тест — тобто на подвійне
 * проходження й подвійний бал у базі.
 *
 * **Питання безпеки — у першому блоці.** Воно позначене `safety: true`, і
 * будь-яка відповідь вище нуля запускає протокол допомоги **незалежно від
 * суми**. Людина з 2 балами з 27 отримує той самий блок, що й з 20. Тому прапор
 * не виводиться зі смуг, а з відповіді — див. `flags.ts`.
 *
 * Джерело: `specs/phq9-gad7/02-instruments.md` (§4, §5, §6), `03-safety.md` (§8).
 *
 * @module @wwwuabot/shared/assessments/mood_anxiety
 */

import type { AssessmentScale, AssessmentTest, HelpLine, ScaleOption } from "./types";
import { ANXIETY_BAND_NOTES, ANXIETY_ITEM_ALERTS } from "./anxiety_texts";
import {
  ANXIETY_ITEMS,
  ANXIETY_SCALE_KEY,
  IMPACT_ITEM,
  MOOD_ITEMS,
  MOOD_SCALE_KEY,
} from "./mood_anxiety_items";
import {
  IMPACT_TEXTS,
  MOOD_BAND_NOTES,
  MOOD_ITEM_ALERTS,
  SAFETY_HIGH,
  SAFETY_LOW,
} from "./mood_texts";

/** Шкала однакова для обох блоків і для питання про вплив. */
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

/** Рівні настрою за §6.1 — межі опубліковані, разом із чутливістю 88% на межі 10. */
const MOOD_BANDS = [
  { key: "phq_minimal", min: 0, max: 4, label: "Мінімальні симптоми" },
  { key: "phq_mild", min: 5, max: 9, label: "Легкі симптоми" },
  { key: "phq_moderate", min: 10, max: 14, label: "Помірні симптоми" },
  { key: "phq_modsevere", min: 15, max: 19, label: "Значно виражені симптоми" },
  { key: "phq_severe", min: 20, max: 27, label: "Тяжкі симптоми" },
] as const;

/** Рівні тривоги за §6.2: межа 10 — стандартна, чутливість близько 89%. */
const ANXIETY_BANDS = [
  { key: "gad_minimal", min: 0, max: 4, label: "Мінімальна тривога" },
  { key: "gad_mild", min: 5, max: 9, label: "Легка тривога" },
  { key: "gad_moderate", min: 10, max: 14, label: "Помірна тривога" },
  { key: "gad_severe", min: 15, max: 21, label: "Виражена тривога" },
] as const;

const SCALES: readonly AssessmentScale[] = [
  {
    key: MOOD_SCALE_KEY,
    title: "Настрій і депресія",
    lead: "Дев'ять запитань про настрій, енергію, сон і самооцінку за останні два тижні.",
    bands: MOOD_BANDS.map((band) => ({ ...band, note: MOOD_BAND_NOTES[band.key] })),
    severityDirection: "higher-is-worse",
    attentionRaw: 10,
    significantChange: { kind: "points", value: 5 },
  },
  {
    key: ANXIETY_SCALE_KEY,
    title: "Тривога",
    lead: "Сім запитань про напругу, тривожні думки та неспокій за останні два тижні.",
    bands: ANXIETY_BANDS.map((band) => ({ ...band, note: ANXIETY_BAND_NOTES[band.key] })),
    severityDirection: "higher-is-worse",
    attentionRaw: 10,
    significantChange: { kind: "points", value: 4 },
  },
];

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

export const MOOD_ANXIETY: AssessmentTest = {
  key: "mood-anxiety",
  title: "Тревожність і депресія",
  lead: "Шістнадцять запитань про останні два тижні у двох блоках — настрій і тривога — та одне про вплив на життя.",
  about:
    "Два блоки запитань про останні два тижні: дев'ять про настрій, енергію та сон (PHQ-9) і сім про тривогу та неспокій (GAD-7). " +
    "Відповідь від «Зовсім ні» до «Майже щодня», тобто 0–3 бали в питанні; кожен блок має власний результат — до 27 і до 21. " +
    "Останнє запитання — про те, як симптоми впливають на повсякденне життя, воно не входить у жодного з результатів. " +
    "PHQ-9 і GAD-7 розробили Роберт Спітцер, Джет Вільямс і Курт Кроенке за освітнього гранту Pfizer Inc.",
  periodLabel: "Упродовж останніх двох тижнів",
  // Акценти й тексти протоколу підставляються тут, щоб списки питань лишалися
  // чистим описом: питання і його пояснення в одному місці розійшлися б з
  // першою ж перестановкою.
  items: [
    ...MOOD_ITEMS.map((item) => ({
      ...item,
      scale: MOOD_SCALE_KEY,
      alertNote: item.safety ? undefined : MOOD_ITEM_ALERTS[item.id],
      safetyTexts: item.safety ? { 1: SAFETY_LOW, 2: SAFETY_HIGH, 3: SAFETY_HIGH } : undefined,
    })),
    ...ANXIETY_ITEMS.map((item) => ({
      ...item,
      scale: ANXIETY_SCALE_KEY,
      alertNote: ANXIETY_ITEM_ALERTS[item.id],
    })),
    IMPACT_ITEM,
  ],
  options: OPTIONS,
  scales: SCALES,
  disclaimerInline: true,
  disclaimer:
    "Це скринінговий інструмент, а не діагноз. Він не встановлює причину: діагноз ставить лише кваліфікований фахівцеві на основі бесіди та обстеження.",
  help: HELP_LINES,
  impact: {
    prompt:
      "Якщо ви позначили будь-яку з проблем вище, наскільки вони ускладнили вам роботу, ведення домашніх справ або спілкування з іншими людьми?",
    options: IMPACT_OPTIONS,
    texts: IMPACT_TEXTS,
  },
  sources: [
    {
      name: "PHQ-9, розроблено Pfizer Inc.",
      citation:
        "Spitzer R. L., Kroenke K., Williams J. B. W. The PHQ-9: validity of a brief depression severity measure. Journal of General Internal Medicine, 2001.",
      url: "https://www.phqscreeners.com/",
      license: "Дозвіл на відтворення, переклад і поширення не потрібен",
    },
    {
      name: "GAD-7, розроблено Pfizer Inc.",
      citation:
        "Spitzer R. L., Kroenke K., Williams J. B. W., Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Archives of Internal Medicine, 2006.",
      url: "https://www.phqscreeners.com/",
      license: "Дозвіл на відтворення, переклад і поширення не потрібен",
    },
  ],
};
