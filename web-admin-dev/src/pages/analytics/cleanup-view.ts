/**
 * Помічники прибирання журналу: форма → запит і людський опис того, що зникне.
 * Порожній набір ознак не означає «все» (`docs/EVENTS.md`).
 *
 * @module web-admin-dev/src/pages/analytics/cleanup-view
 */

import {
  EVENT_KIND_LABELS,
  SURFACE_LABELS,
  type EventKind,
  type EventSurface,
} from "@wwwuabot/shared/events";
import { formatStamp } from "@wwwuabot/shared/utils/datetime";
import { rangeFromInputs, toDateTimeInput } from "./analytics-view";

/** Види подій у випадаючому списку — в тому порядку, що й у типі. */
export const CLEANUP_KINDS: readonly EventKind[] = [
  "view",
  "request",
  "command",
  "message",
  "callback",
  "inline_query",
  "edited_message",
];

export const CLEANUP_SURFACES: readonly EventSurface[] = ["bot", "platform"];

export interface CleanupForm {
  /** «Усі люди» чи одна людина за номером. */
  scope: "all" | "user";
  userId: string;
  /** «За весь час» чи заданий період. */
  period: "all" | "range";
  fromInput: string;
  toInput: string;
  surface: "" | EventSurface;
  kind: "" | EventKind;
}

export interface CleanupRequest {
  all?: boolean;
  userId?: number;
  from?: string;
  to?: string;
  surface?: EventSurface;
  kind?: EventKind;
}

/** Типово — поточний діапазон екрана: частіше прибирають те, що зараз видно. */
export function initialCleanupForm(range: { from: string; to: string }): CleanupForm {
  return {
    scope: "all",
    userId: "",
    period: "range",
    fromInput: toDateTimeInput(range.from),
    toInput: toDateTimeInput(range.to),
    surface: "",
    kind: "",
  };
}

/** Форма → тіло запиту; помилка замість «ну, тоді все». */
export function buildCleanupRequest(
  form: CleanupForm,
): { request: CleanupRequest } | { error: string } {
  const request: CleanupRequest = {};

  if (form.scope === "user") {
    const userId = Number(form.userId.trim());
    if (!Number.isInteger(userId) || userId <= 0) return { error: "Вкажіть номер користувача" };
    request.userId = userId;
  }

  if (form.period === "range") {
    if (!form.fromInput && !form.toInput) return { error: "Вкажіть початок або кінець періоду" };
    const { from, to } = rangeFromInputs(form.fromInput, form.toInput);
    request.from = from;
    request.to = to;
  }

  if (form.surface) request.surface = form.surface;
  if (form.kind) request.kind = form.kind;
  if (Object.keys(request).length === 0) request.all = true;

  return { request };
}

/** Що саме зникне — словами, для підтвердження. */
export function cleanupTargetLabel(request: CleanupRequest): string {
  const parts: string[] = [];

  if (!request.all && request.userId !== undefined) parts.push(`користувач #${request.userId}`);

  if (request.from && request.to) {
    parts.push(`період ${formatStamp(request.from)} — ${formatStamp(request.to)}`);
  } else if (!request.all) {
    parts.push("за весь час");
  }

  if (request.surface) parts.push(SURFACE_LABELS[request.surface]);
  if (request.kind) parts.push(EVENT_KIND_LABELS[request.kind]);

  return parts.length === 0 ? "усі події журналу" : parts.join(" · ");
}
