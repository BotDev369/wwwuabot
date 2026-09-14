/**
 * scenario-json-validation.ts — чисте ядро JSON-редактора сценарію.
 *
 * Навіщо окремо: те саме правило «що вважати валідним JSON цієї вкладки»
 * існувало в трьох місцях (збереження, «Застосувати», перевірка на кожен
 * символ) і кожне мало свої тексти помилок. Тепер текст один і приходить
 * звідси.
 */

import { deserializeJsonFields, extractFieldsFromJson } from "./scenario-json-helpers";
import { getFieldsForTab, type MainTab } from "./scenario-modal-types";

/** Поля, які пише база: у тілі запиту їх бути не мусить. */
const SERVER_FIELDS = new Set(["id", "created_at", "updated_at"]);

const EMPTY = "JSON редактор порожній";

export type JsonObjectResult =
  { ok: true; value: Record<string, unknown> } | { ok: false; error: string; saveMessage: string };

/** Розбір тексту редактора. Два тексти на помилку: у редакторі й у тості збереження. */
export function parseJsonObject(text: string): JsonObjectResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: EMPTY, saveMessage: EMPTY };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      error: "Невалідний JSON",
      saveMessage: "Неможливо зберегти: невалідний JSON у редакторі",
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      error: "JSON має бути об'єктом",
      saveMessage: "Неможливо зберегти: JSON має бути об'єктом",
    };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}

/** Текст редактора для вкладки: ті самі поля, що редагує конструктор цієї вкладки. */
export function jsonTextForTab(mainTab: MainTab, allFields: Record<string, unknown>): string {
  const tabFields = getFieldsForTab(mainTab, allFields);
  return JSON.stringify(deserializeJsonFields(tabFields, mainTab), null, 2);
}

/** Застосовує розібраний JSON до полів сценарію (правила — у `scenario-json-helpers`). */
export function applyJsonToFields(
  parsed: Record<string, unknown>,
  mainTab: MainTab,
  current: Record<string, unknown>,
): Record<string, unknown> {
  return extractFieldsFromJson(parsed, mainTab, current);
}

/** Прибирає поля, якими володіє база. `slug` тут **не** викидається — це звичайне поле. */
export function stripServerFields(fields: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SERVER_FIELDS.has(key)) continue;
    payload[key] = value;
  }
  return payload;
}
