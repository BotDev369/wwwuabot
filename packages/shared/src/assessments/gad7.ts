/**
 * GAD-7 — шкала генералізованого тривожного розладу, сім питань.
 *
 * **У GAD-7 немає питання безпеки** — на відміну від PHQ-9. Протокол
 * допомоги в ньому не спрацьовує, і це має бути видимим у коді, а не
 * відчуттям: поле `safety` тут порожнє, тож `safetyOf` поверне
 * `triggered: false` для будь-яких відповідей.
 *
 * Джерело: `specs/phq9-gad7/02-instruments.md` (§5, §6).
 *
 * @module @wwwuabot/shared/assessments/gad7
 */

import type { AssessmentItem, AssessmentTest, HelpLine, ScaleOption } from "./types";
import { GAD7_ABOUT, GAD7_BAND_NOTES, GAD7_IMPACT_TEXTS, GAD7_ITEM_ALERTS } from "./gad7_texts";

/** Шкала однакова з PHQ-9 — але окремим масивом, бо інструменти незалежні. */
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

/** Сім питань + питання про вплив (поза сумою). `alertAtLeast: 2` — §6.4. */
const ITEMS: readonly AssessmentItem[] = [
  {
    id: "tension",
    text: "Відчуття нервованості, тривоги або внутрішнього напруження",
    label: "Напруга",
    alertAtLeast: 2,
  },
  {
    id: "worry",
    text: "Нездатність зупинити або контролювати тривожні думки",
    label: "Тривожні думки",
    alertAtLeast: 2,
  },
  {
    id: "excessive",
    text: "Надмірне хвилювання через різні речі",
    label: "Хвилювання",
    alertAtLeast: 2,
  },
  {
    id: "relax",
    text: "Труднощі з розслабленням",
    label: "Розслаблення",
    alertAtLeast: 2,
  },
  {
    id: "restless",
    text: "Настільки сильний неспокій, що важко всидіти на місці",
    label: "Неспокій",
    alertAtLeast: 2,
  },
  {
    id: "irritable",
    text: "Легка дратівливість або роздратування",
    label: "Дратівливість",
    alertAtLeast: 2,
  },
  {
    id: "afraid",
    text: "Страх, ніби може статися щось жахливе",
    label: "Очікування лиха",
    alertAtLeast: 2,
  },
  {
    id: "impact",
    text: "Якщо ви позначили будь-яку з проблем вище, наскільки вони ускладнили вам роботу, ведення домашніх справ або спілкування з іншими людьми?",
    label: "Вплив на життя",
    countsTowardScore: false,
  },
];

/** Рівні за §6.2: межа 10 — стандартна, чутливість близько 89%. */
const BANDS = [
  { key: "gad_minimal", min: 0, max: 4, label: "Мінімальна тривога" },
  { key: "gad_mild", min: 5, max: 9, label: "Легка тривога" },
  { key: "gad_moderate", min: 10, max: 14, label: "Помірна тривога" },
  { key: "gad_severe", min: 15, max: 21, label: "Виражена тривога" },
] as const;

/** Ті самі лінії, що й у PHQ-9: спільна довідка, один список у базі. */
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

export const GAD_7: AssessmentTest = {
  key: "gad7",
  title: "Тривога",
  lead: "Сім запитань про останні два тижні й одне про вплив на життя. Близько двох хвилин.",
  about: GAD7_ABOUT,
  periodLabel: "Упродовж останніх двох тижнів",
  items: ITEMS.map((item) => ({ ...item, alertNote: GAD7_ITEM_ALERTS[item.id] })),
  options: OPTIONS,
  bands: BANDS.map((band) => ({ ...band, note: GAD7_BAND_NOTES[band.key] })),
  severityDirection: "higher-is-worse",
  attentionBelow: 10,
  significantChange: { kind: "points", value: 4 },
  disclaimerInline: true,
  disclaimer:
    "Це скринінговий інструмент, а не діагноз. Він не встановлює причину: діагноз ставить лише кваліфікований фахівцеві на основі бесіди та обстеження.",
  help: HELP_LINES,
  impact: {
    prompt: "Якщо ви позначили будь-яку з проблем вище, наскільки вони ускладнили вам життя?",
    options: IMPACT_OPTIONS,
    texts: GAD7_IMPACT_TEXTS,
  },
  combinedGroup: "phq9-gad7",
  source: {
    name: "GAD-7, розроблено Pfizer Inc.",
    citation:
      "Spitzer R. L., Kroenke K., Williams J. B. W., Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Archives of Internal Medicine, 2006. Дозвіл на відтворення, переклад і поширення не потрібен.",
    url: "https://www.phqscreeners.com/",
    license: "No permission required to reproduce, translate, display or distribute",
  },
};
