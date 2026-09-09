/**
 * Types for MyDatesTable block — re-exports from shared + block-specific types.
 */

import type { MyDate as SharedMyDate } from "@wwwuabot/shared/types/mydate";
import type { SortField as SharedSortField } from "@wwwuabot/shared/utils/mydate-helpers";

export type MyDate = SharedMyDate;
export type SortField = SharedSortField;
export type SortOrder = "asc" | "desc";
export type ModalMode = "create" | "edit" | "view";
