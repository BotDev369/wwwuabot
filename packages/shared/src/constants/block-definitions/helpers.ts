/**
 * Хелпери для компактного визначення блоків Page Builder.
 *
 * Замінює розгорнуті JSON-схеми на стислий запис.
 * Економія: ~1957 → ~600 рядків (−70%).
 *
 * @module packages/shared/src/constants/block-definitions/helpers
 */

import type { BlockDefinition, BlockZone, BlockCategory } from "../../types/page-config";

// ── Field shorthands ────────────────────────────────────────────────

/** Текстове поле. */
export function s(
  title: string,
  opts?: { default?: string; format?: string },
): Record<string, unknown> {
  const field: Record<string, unknown> = { type: "string", title };
  if (opts?.default !== undefined) field.default = opts.default;
  if (opts?.format) field.format = opts.format;
  return field;
}

/** Числове поле. */
export function n(title: string, opts?: { default?: number }): Record<string, unknown> {
  const field: Record<string, unknown> = { type: "number", title };
  if (opts?.default !== undefined) field.default = opts.default;
  return field;
}

/** Boolean поле. */
export function b(title: string, opts?: { default?: boolean }): Record<string, unknown> {
  const field: Record<string, unknown> = { type: "boolean", title };
  if (opts?.default !== undefined) field.default = opts.default;
  return field;
}

/** Enum поле (випадаючий список). */
export function e(
  title: string,
  values: string[],
  opts?: { default?: string },
): Record<string, unknown> {
  const field: Record<string, unknown> = { type: "string", title, enum: values };
  if (opts?.default !== undefined) field.default = opts.default;
  return field;
}

/** Масив простих рядків. */
export function sa(title: string): Record<string, unknown> {
  return { type: "array", title, items: { type: "string" } };
}

/** Масив об'єктів з визначеними полями. */
export function oa(
  title: string,
  itemProps: Record<string, Record<string, unknown>>,
  required?: string[],
): Record<string, unknown> {
  return {
    type: "array",
    title,
    items: {
      type: "object",
      properties: itemProps,
      ...(required ? { required } : {}),
    },
  };
}

// ── Block definition builder ────────────────────────────────────────

type AllZones = BlockZone[];

interface BlockDefInput {
  type: string;
  label: string;
  description?: string;
  icon?: string;
  category: BlockCategory;
  compatibleZones?: AllZones;
  props: Record<string, Record<string, unknown>>;
  required?: string[];
  defaultProps?: Record<string, unknown>;
}

const ALL: AllZones = ["header", "sidebar", "main", "footer"];

/**
 * Компактне визначення блоку.
 *
 * @example
 * block({
 *   type: "text", label: "Текст", icon: "text", category: "content",
 *   props: { title: s("Заголовок"), content: s("Текст"), level: e("Рівень", ["h1","h2","h3","body"], { default: "body" }) },
 *   defaultProps: { title: "", content: "", level: "body", align: "left" },
 * })
 */
export function block(input: BlockDefInput): BlockDefinition {
  return {
    type: input.type,
    label: input.label,
    description: input.description,
    icon: input.icon,
    category: input.category,
    compatibleZones: input.compatibleZones ?? ALL,
    schema: {
      type: "object",
      properties: input.props,
      ...(input.required ? { required: input.required } : {}),
    },
    defaultProps: input.defaultProps ?? {},
  };
}
