/**
 * Спільні типи й чисті помічники екрана «Люди і події»: без React, щоб
 * компоненти лишалися лише розміткою.
 *
 * @module web-platform-dev/src/pages/analysis/people-model
 */

import type { MyDate } from "@wwwuabot/shared/types/mydate";

export type Kind = "person" | "event";

export interface Draft {
  date: string;
  name: string;
}

/** Людська дата: `1980-03-03` → `3.03.1980`. */
export function humanDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(day)}.${month}.${year}`;
}

export function kindOf(one: MyDate): Kind {
  return one.type === "event" ? "event" : "person";
}
