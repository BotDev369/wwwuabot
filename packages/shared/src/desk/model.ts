/**
 * Контракт «Стола»: сторони, групи, статуси, види й нормалізація входу —
 * спільне для API й адмінки, щоб «невідомий вид» не означав на екрані одне,
 * а в базі інше. Слів для людини тут немає: їх тримає JSON/база.
 *
 * @module @wwwuabot/shared/desk/model
 */

/** Сторони столу: рівно дві, і це формат «я і ти», а не соцмережа. */
export const DESK_SIDES = ["serhii", "buffy"] as const;
export type DeskSide = (typeof DESK_SIDES)[number];

/** Хід теми: конкретна сторона або нічия (пауза, завершене, архів). */
export const DESK_TURNS = [...DESK_SIDES, "none"] as const;
export type DeskTurn = (typeof DESK_TURNS)[number];

/** Групи — ключі; підписи живуть у UI. */
export const DESK_GROUPS = ["plan", "task", "debt", "question", "file"] as const;
export type DeskGroup = (typeof DESK_GROUPS)[number];

/** Статус теми. `turn` — окремо: «в роботі» й «чекає на когось» — різні речі. */
export const DESK_STATUSES = ["open", "doing", "done", "dropped"] as const;
export type DeskStatus = (typeof DESK_STATUSES)[number];

/** Види запису. */
export const DESK_KINDS = [
  "note",
  "question",
  "answer",
  "decision",
  "plan",
  "debt",
  "file",
] as const;
export type DeskKind = (typeof DESK_KINDS)[number];

/** Тема для списку й для шапки. `unread` рахує сервер. */
export interface DeskThread {
  id: number;
  group: DeskGroup | string;
  subgroup: string;
  title: string;
  status: DeskStatus | string;
  turn: DeskTurn | string;
  tags: string[];
  due_at: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  last_entry_at: string;
  archived: boolean;
  entries: number;
  unread: number;
}

/** Запис стрічки. `meta` — те, що не текст (строк боргу, сума, рішення). */
export interface DeskEntry {
  id: number;
  thread_id: number;
  author: DeskSide | string;
  kind: DeskKind | string;
  body: string;
  meta: Record<string, unknown>;
  reply_to: number | null;
  created_at: string;
  edited_at: string | null;
}

/** Файл теми: байти в R2, тут — облік. */
export interface DeskFile {
  id: number;
  thread_id: number;
  entry_id: number | null;
  author: DeskSide | string;
  name: string;
  mime: string;
  bytes: number;
  created_at: string;
}

export interface DeskThreadView {
  thread: DeskThread;
  entries: DeskEntry[];
  files: DeskFile[];
}

/** Стеля одного файлу: більше — це архів, а архіву місце не в столі. */
export const DESK_FILE_MAX_BYTES = 20 * 1024 * 1024;

const oneOf = <T extends readonly string[]>(
  allowed: T,
  value: unknown,
  fallback: T[number],
): T[number] =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;

/** Заголовок: один рядок, без розмітки, не довший за 200 символів. */
export function sanitizeTitle(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 200) : "";
}

/** Текст запису: переноси лишаються, ріжеться лише хвіст і стеля. */
export function sanitizeBody(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 20_000) : "";
}

/** Підгрупа — вільне слово людини, а не перелік. */
export function sanitizeSubgroup(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 80) : "";
}

/** Дата боргу — `YYYY-MM-DD` або нічого: її сортує сам SQL як текст. */
export function sanitizeDueAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

/** Пріоритет — 0/1/2; усе інше стає 0, щоб сміття не ламало сортування. */
export function sanitizePriority(value: unknown): number {
  const number = Number(value);
  return number === 1 || number === 2 ? number : 0;
}

/** `meta` — об'єкт; масив, рядок і `null` стають порожнім об'єктом. */
export function sanitizeMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 20));
}

export interface DeskThreadInput {
  group: DeskGroup;
  subgroup: string;
  title: string;
  status: DeskStatus;
  turn: DeskTurn;
  due_at: string | null;
  priority: number;
}

/**
 * Нормалізація теми: без заголовка теми немає, завершена тема не має черги.
 *
 * Правило про `turn` живе тут, а не в SQL: «зроблено» з чергою показувалось би
 * в списку «моя черга», і сторона щоразу перечитувала б завершене.
 */
export function buildThreadInput(
  body: Record<string, unknown>,
  tags: string[],
): (DeskThreadInput & { tags: string[] }) | null {
  const title = sanitizeTitle(body.title);
  if (!title) return null;
  const status = oneOf(DESK_STATUSES, body.status, "open");
  const turn =
    status === "done" || status === "dropped" ? "none" : oneOf(DESK_TURNS, body.turn, "none");
  return {
    group: oneOf(DESK_GROUPS, body.group, "plan"),
    subgroup: sanitizeSubgroup(body.subgroup),
    title,
    status,
    turn,
    tags,
    due_at: sanitizeDueAt(body.due_at),
    priority: sanitizePriority(body.priority),
  };
}

export interface DeskEntryInput {
  kind: DeskKind;
  body: string;
  meta: Record<string, unknown>;
  reply_to: number | null;
}

/** Нормалізація запису: порожній текст не створює рядка. */
export function buildEntryInput(body: Record<string, unknown>): DeskEntryInput | null {
  const text = sanitizeBody(body.body);
  if (!text) return null;
  const replyTo = Number(body.reply_to);
  return {
    kind: oneOf(DESK_KINDS, body.kind, "note"),
    body: text,
    meta: sanitizeMeta(body.meta),
    reply_to: Number.isInteger(replyTo) && replyTo > 0 ? replyTo : null,
  };
}
