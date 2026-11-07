/**
 * `page_data` проти схем блоків: не форма, а зміст.
 *
 * `error` — блок не зробить обіцяного; `warn` — дані розійшлися зі схемою, але
 * сторінка рендериться. Два рівні й навіщо вони — docs/PAGES.md §2.
 *
 * @module packages/shared/src/types/page-config.validate
 */

import { getBlockDefinition } from "../constants/block-definitions/index";
import { ALL_ZONES } from "./page-config.utils";
import type { PageBlock, PageConfig } from "./page-config.types";

/** Наскільки погано: `error` ламає обіцянку блока, `warn` — лише розбіжність. */
export type PageDataSeverity = "error" | "warn";

/** Одна знахідка: де саме, що не так і чи це помилка. */
export interface PageDataIssue {
  /** Шлях до місця в конфігу: `main[3].children[0].props.title`. */
  path: string;
  message: string;
  severity: PageDataSeverity;
}

/** Оголошення одного поля блока — те, що дають `s()`, `n()`, `b()`, `e()`. */
interface SchemaField {
  type?: string;
  title?: string;
  enum?: unknown[];
}

/** Схема блока в тому вигляді, у якому її треба читати перевірці. */
interface BlockSchema {
  properties: Record<string, SchemaField>;
  required: string[];
}

/** Схема блока; невідомий тип — `null` (це вже помилка сама по собі). */
function schemaOf(type: string): BlockSchema | null {
  const definition = getBlockDefinition(type);
  if (!definition) return null;
  const schema = definition.schema as {
    properties?: Record<string, SchemaField>;
    required?: string[];
  };
  return { properties: schema.properties ?? {}, required: schema.required ?? [] };
}

/**
 * Порожнє значення — те, чого людина не бачить.
 *
 * Порожній рядок і порожній масив рахуються порожніми: обов'язкове поле з
 * `""` — це та сама дірка, що й відсутнє, лише тихіша.
 */
function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Чи значення того типу, який обіцяє схема. */
function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    /* Невідомий тип схеми не перевіряємо: вигадати правило гірше, ніж не мати. */
    default:
      return true;
  }
}

/** Пройти блоки зони (і їхніх дітей) і зібрати знахідки. */
function walkBlocks(blocks: PageBlock[], prefix: string, issues: PageDataIssue[]): void {
  blocks.forEach((block, index) => {
    const path = `${prefix}[${index}]`;
    const type = typeof block?.type === "string" ? block.type : "";
    const schema = schemaOf(type);
    if (!schema) {
      issues.push({ path, message: `невідомий тип блока «${type}»`, severity: "error" });
      return;
    }

    const props = (block.props ?? {}) as Record<string, unknown>;

    for (const [key, value] of Object.entries(props)) {
      const field = schema.properties[key];
      if (!field) {
        issues.push({
          path: `${path}.props.${key}`,
          message: `поля «${key}» немає в оголошенні блока «${type}» — його ніхто не читає`,
          severity: "warn",
        });
        continue;
      }
      if (isEmpty(value)) continue;

      if (field.type && !matchesType(value, field.type)) {
        issues.push({
          path: `${path}.props.${key}`,
          message: `поле «${key}» має бути ${field.type}, а прийшло ${typeof value}`,
          severity: "error",
        });
        continue;
      }

      if (Array.isArray(field.enum) && !field.enum.includes(value)) {
        issues.push({
          path: `${path}.props.${key}`,
          message: `значення «${String(value)}» не входить до списку: ${field.enum.join(", ")}`,
          severity: "error",
        });
      }
    }

    for (const key of schema.required) {
      if (isEmpty(props[key])) {
        issues.push({
          path: `${path}.props.${key}`,
          message: `обов'язкове поле «${key}» порожнє`,
          severity: "warn",
        });
      }
    }

    if (Array.isArray(block.children) && block.children.length > 0) {
      walkBlocks(block.children, `${path}.children`, issues);
    }
  });
}

/**
 * Усі розбіжності конфігу зі схемами блоків.
 *
 * Чиста функція: ні мережі, ні React, ні бази — тож нею користуються і
 * адмінка, і звіт по дампу. Порожній масив означає «дані й оголошення
 * збігаються», а не «перевірку вимкнено».
 */
export function validatePageConfig(config: PageConfig): PageDataIssue[] {
  const issues: PageDataIssue[] = [];
  for (const zone of ALL_ZONES) {
    const blocks = config.zones?.[zone];
    if (Array.isArray(blocks)) walkBlocks(blocks, zone, issues);
  }
  return issues;
}

/** Скільки знахідок кожного рівня — те, що друкує звіт. */
export function countPageDataIssues(issues: readonly PageDataIssue[]): {
  errors: number;
  warnings: number;
} {
  let errors = 0;
  let warnings = 0;
  for (const issue of issues) {
    if (issue.severity === "error") errors += 1;
    else warnings += 1;
  }
  return { errors, warnings };
}
