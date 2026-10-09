/**
 * Логіка над довідником: дістати пояснення й трактування та **дописати** їх до
 * відповіді. Дані — окремо (`mydate-interpretations.ts`), бо таблиця довідника
 * довга, а функцій тут мало: `about` — що визначає параметр, `meaning` — що
 * означає конкретне значення, плюс історія самої системи.
 *
 * @module api-dev/src/shared/mydate-interpretation-helpers
 */

import { MEANINGS, SYSTEM_HISTORY } from "./mydate-interpretations";
import type { SystemAnalysisResult } from "./mydate-helpers";

/** Що визначає параметр: його пояснення; `undefined` — довідник його не знає. */
export function aboutFor(systemId: string, key: string): string | undefined {
  return MEANINGS[systemId]?.[key]?.about;
}

/** Історія системи для розкритого акордеона; `undefined` — довідник її не знає. */
export function historyFor(systemId: string): string | undefined {
  return SYSTEM_HISTORY[systemId];
}

/**
 * Система з реєстру плюс те, що знає довідник: `history` і `about` параметрів.
 *
 * Однією функцією, бо це одне рішення — «що дописує код до рядка реєстру»,
 * і друге місце, де його ухвалюють, розійшлося б із першим.
 */
export function withSystemAbout(system: {
  id: string;
  parameters: ReadonlyArray<{ key: string; label: string }>;
}): {
  history?: string;
  parameters: Array<{ key: string; label: string; about?: string }>;
} {
  const history = historyFor(system.id);
  return {
    ...(history ? { history } : {}),
    parameters: withParameterAbout(system.id, system.parameters),
  };
}

/**
 * Параметри реєстру з поясненнями — те, що показує вітрина систем.
 *
 * `about` лишається власністю цього довідника, а не рядка `analysis_systems`:
 * інакше те саме пояснення жило б у двох місцях і розійшлося б першою ж правкою.
 */
export function withParameterAbout(
  systemId: string,
  parameters: ReadonlyArray<{ key: string; label: string }>,
): Array<{ key: string; label: string; about?: string }> {
  return parameters.map((parameter) => {
    const about = aboutFor(systemId, parameter.key);
    return about ? { ...parameter, about } : { ...parameter };
  });
}

/** Трактування одного значення; `undefined` — довідник його не знає. */
export function meaningFor(systemId: string, key: string, value: unknown): string | undefined {
  const parameter = MEANINGS[systemId]?.[key];
  if (!parameter) return undefined;
  return parameter.values?.[String(value)] ?? parameter.general;
}

/**
 * Той самий результат, але кожен параметр із поясненням і трактуванням:
 * `about` — що визначаємо, `meaning` — що отримали.
 *
 * Повертає **нові** об'єкти: результат іде і в `saveAnalysis`, тож дописані на
 * місці тексти осіли б у знімку в D1 і пережили б правку довідника.
 */
export function withMeanings(systemId: string, result: SystemAnalysisResult): SystemAnalysisResult {
  const parameters = Array.isArray(result.parameters) ? result.parameters : [];
  return {
    ...result,
    parameters: parameters.map((parameter) => {
      const about = aboutFor(systemId, parameter.key);
      const meaning = meaningFor(systemId, parameter.key, parameter.value);
      return {
        ...parameter,
        ...(about ? { about } : {}),
        ...(meaning ? { meaning } : {}),
      };
    }),
  };
}
