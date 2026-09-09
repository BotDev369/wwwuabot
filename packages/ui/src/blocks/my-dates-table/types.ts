/**
 * Types for MyDatesTable block.
 */

export interface MyDate {
  id: string;
  user_id: number;
  date: string;
  type: string;
  name: string;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export type SortField = "date" | "type" | "name" | "tags" | "notes" | "created_at";
export type SortOrder = "asc" | "desc";
export type ModalMode = "create" | "edit" | "view";
