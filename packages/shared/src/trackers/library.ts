/**
 * Поверхні на читання — «Шаблони» й «Публічні» — і те, звідки береться копія в
 * «Моїх». Окремо від механіки мірок: публікується **форма** мірки, а не
 * історія, і сама ця межа варта власного модуля (`docs/TRACKERS.md`).
 *
 * @module @wwwuabot/shared/trackers/library
 */

import type { IconName } from "../components/icon-names";
import type { TrackerFields, TrackerMode } from "../trackers";
import { catalogEntry } from "./catalog";
import type { TrackerCatalogGroupKey } from "./catalog";

/**
 * Шаблон у вкладці «Шаблони»: рядок каталогу плюс те, чи вже доданий копією
 * в «Мої». Копія тому й потрібна, що каталог — дані в коді, а не рядки бази:
 * нічого не сіється, тож «додати» — це завжди явний крок людини.
 */
export interface TrackerTemplate {
  key: string;
  title: string;
  unit: string;
  step: number;
  goal: number | null;
  min: number;
  max: number | null;
  mode: TrackerMode;
  icon: IconName;
  groupKey: TrackerCatalogGroupKey;
  added: boolean;
}

/**
 * Опубліковане визначення мірки — **без жодного виміру**: назва, одиниця,
 * крок, ціль, тип. Історію не віддає ніхто й ніколи.
 */
export interface PublicTracker extends TrackerFields {
  id: number;
  icon: IconName;
  /** Ім'я на платформі; порожнє — людина закрила профіль. */
  author: string;
  /** Чи це вже моя мірка — «У моїх» замість «Додати». */
  mine: boolean;
}

/** Звідки додати копію: рядок каталогу або чуже опубліковане визначення. */
export type TrackerCopySource = { kind: "catalog"; key: string } | { kind: "public"; id: number };

/**
 * Джерело копії з тіла запиту: `catalog:water` / `public:12`.
 *
 * Ключ каталогу перевіряємо тут, бо `catalog:<вигадане>` — це не «не знайдено»,
 * а безглузде прохання; номер публічного — лише форма, існування питає база.
 */
export function parseTrackerSource(raw: unknown): TrackerCopySource | null {
  if (typeof raw !== "string") return null;
  const [kind, value] = raw.split(":");
  if (!value) return null;
  if (kind === "catalog") {
    return catalogEntry(value) ? { kind: "catalog", key: value } : null;
  }
  if (kind === "public") {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? { kind: "public", id } : null;
  }
  return null;
}

/**
 * Ключ копії в **просторі власника**: `UNIQUE (owner_id, key)` не дозволяє
 * двом однаковим ключам жити поруч, тож каталог лишає свій ключ, а чужий
 * трекер отримує `public-<id>` — інакше друга копія того самого «Вода» з
 * каталогу зіткнулася б із першою.
 */
export function trackerCopyKey(source: TrackerCopySource): string {
  return source.kind === "catalog" ? source.key : `public-${source.id}`;
}
