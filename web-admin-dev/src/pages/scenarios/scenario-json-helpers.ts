/**
 * scenario-json-helpers.ts — Допоміжні функції для серіалізації,
 * десеріалізації та витягування полів сценарію з JSON.
 */

import { createEmptyPageConfig } from "@wwwuabot/shared/types/page-config";
import { type MainTab, getFieldsForTab } from "./scenario-modal-types";

/** Поля, які зберігаються як JSON-строки в БД (SQLite/D1), але редагуються як об'єкти. */
export const JSON_STRING_FIELDS = ["page_data", "rich_data", "buttons"];

/**
 * Десеріалізує JSON-строки у об'єкти для зручного відображення та редагування в JSON-редакторі.
 */
export function deserializeJsonFields(
  fields: Record<string, unknown>,
  mainTab?: MainTab,
): Record<string, unknown> {
  const result = { ...fields };
  for (const key of JSON_STRING_FIELDS) {
    const value = result[key];
    if (typeof value === "string" && value.trim()) {
      try {
        result[key] = JSON.parse(value);
      } catch {
        // Якщо не парситься — залишаємо як є
      }
    }
  }
  // Для вкладки web: якщо page_data порожній або null — надаємо валідну порожню конфігурацію
  if (mainTab === "web" || "page_data" in fields) {
    if (!result.page_data || result.page_data === "null") {
      result.page_data = createEmptyPageConfig();
    }
  }
  return result;
}

/**
 * Серіалізує об'єкти у JSON-строки перед відправкою в БД (D1 SQLite).
 * Будь-які складні об'єкти чи масиви перетворюються на валідний JSON-рядок.
 */
export function serializeJsonFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result = { ...fields };
  for (const [key, value] of Object.entries(result)) {
    if (value !== null && value !== undefined && typeof value === "object") {
      try {
        result[key] = JSON.stringify(value);
      } catch {
        // Якщо не серіалізується — залишаємо як є
      }
    }
  }
  return result;
}

/**
 * Витягує поля сценарію з розпарсеного об'єкта JSON.
 * Підтримує:
 * - Прямий конфіг PageConfig для web: { version: 1, zones: ... }
 * - Обгорнутий конфіг: { page_data: { ... } }
 * - Поля rich_data та rich_message для bot_rich
 * - Будь-які інші поля відповідно до вкладки
 */
export function extractFieldsFromJson(
  parsed: Record<string, unknown>,
  mainTab: MainTab,
  currentFields: Record<string, unknown>,
): Record<string, unknown> {
  const updated = { ...currentFields };
  const tabFields = getFieldsForTab(mainTab, currentFields);

  if (mainTab === "web") {
    let pageData: unknown;
    if ("page_data" in parsed) {
      pageData = parsed.page_data;
    } else {
      // Користувач вставив прямий конфіг PageConfig { version, zones, visibleZones... }
      pageData = parsed;
    }

    if (pageData === null || pageData === undefined) {
      updated.page_data = null;
    } else if (typeof pageData === "string") {
      updated.page_data = pageData;
    } else {
      updated.page_data = JSON.stringify(pageData);
    }
  } else if (mainTab === "bot_rich") {
    if ("rich_data" in parsed) {
      updated.rich_data =
        typeof parsed.rich_data === "string" ? parsed.rich_data : JSON.stringify(parsed.rich_data);
    }
    if ("rich_message" in parsed) {
      updated.rich_message = parsed.rich_message === null ? null : String(parsed.rich_message);
    }
  } else {
    for (const key of Object.keys(tabFields)) {
      if (key in parsed) {
        const val = parsed[key];
        updated[key] = val !== null && typeof val === "object" ? JSON.stringify(val) : val;
      }
    }
  }

  return updated;
}
