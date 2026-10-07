/**
 * useMyDates — єдиний хук екрана «Дати»: завантаження, фільтри, сортування,
 * вибір рядків, CRUD і стан модалки.
 *
 * Споживач — блок `MyDatesTableBlock`; окремої сторінки з датами в платформі
 * немає. Якщо з'явиться, вона мусить брати цей хук, а не свою копію логіки:
 * саме через дві реалізації один баг доводилось правити у двох місцях
 * (`AGENTS.md` §3, «двічі — в спільне»).
 *
 * Цей файл — лише композиція: стан живе у `useDateFilters`, `useDateSelection`,
 * `useExpansion` і `useDateModal`, перетворення — у `filter-sort`,
 * запити — в `api`.
 *
 * @module packages/ui/src/blocks/my-dates-table/useMyDates
 */

import { useCallback, useEffect, useState } from "react";
import { useDialog } from "../../dialog";
import { useExpansion } from "@wwwuabot/ui/hooks";
import type { MyDate } from "./types";
import { deleteMyDate, deleteMyDates, fetchMyDates, saveMyDate } from "../mydate/api";
import { useDateFilters } from "./useDateFilters";
import { useDateModal } from "./useDateModal";
import { useDateSelection } from "./useDateSelection";
import type { UseMyDatesOptions, UseMyDatesReturn } from "./useMyDates.types";

export type { UseMyDatesOptions, UseMyDatesReturn } from "./useMyDates.types";

const errorText = (e: unknown) => `Помилка: ${String(e).slice(0, 100)}`;

/**
 * Аналіз — одна адреса на одну й більше дат: екран сам спитає системи й
 * параметри, а далі покаже таблицю, де кожна дата має свій стовпець.
 */
function analysisUrl(dates: MyDate[]): string {
  const param = encodeURIComponent(dates.map((d) => d.date).join(","));
  return `/mydate/analysis?dates=${param}`;
}

export function useMyDates(options: UseMyDatesOptions = {}): UseMyDatesReturn {
  const { autoFetch = true, refreshAfterMutation = true } = options;
  const dialog = useDialog();

  const [dates, setDates] = useState<MyDate[]>([]);
  // `loading` не смикається назад у `true`: інакше таблиця зникала б на кожному
  // оновленні після save/delete. Порожній список — це `dates.length === 0`.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDates = useCallback(async () => {
    try {
      setDates(await fetchMyDates());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) void refreshDates();
  }, [autoFetch, refreshDates]);

  const filters = useDateFilters(dates);
  const selection = useDateSelection(filters.processedDates);
  const expansion = useExpansion();
  const modal = useDateModal();

  const afterMutation = useCallback(async () => {
    if (!refreshAfterMutation) return;
    await refreshDates();
  }, [refreshAfterMutation, refreshDates]);

  const handleSave = useCallback(
    async (data: Partial<MyDate>) => {
      try {
        await saveMyDate(data);
        modal.closeModal();
        await afterMutation();
      } catch (e) {
        setError(errorText(e));
      }
    },
    [afterMutation, modal],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMyDate(id);
        modal.closeModal();
        await afterMutation();
      } catch (e) {
        setError(errorText(e));
      }
    },
    [afterMutation, modal],
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selection.selectedIds];
    if (ids.length === 0) return;
    const ok = await dialog.confirm(`Видалити ${ids.length} дат(у)?`, {
      tone: "danger",
      confirmText: "Видалити",
    });
    if (!ok) return;
    try {
      await deleteMyDates(ids);
      selection.clearSelection();
      await afterMutation();
    } catch (e) {
      setError(errorText(e));
    }
  }, [afterMutation, dialog, selection]);

  const selectedDates = useCallback(
    () => filters.processedDates.filter((d) => selection.selectedIds.has(d.id)),
    [filters.processedDates, selection.selectedIds],
  );

  // Одна дія на одну й більше дат: аналіз — це та сама таблиця, тож вибір
  // систем стоїть у ньому, а не в окремому процесі поруч.
  const handleBulkAnalyze = useCallback(() => {
    const selected = selectedDates();
    if (selected.length === 0) return;
    window.location.href = analysisUrl(selected);
  }, [selectedDates]);

  return {
    dates,
    loading,
    error,
    refreshDates,
    ...filters,
    ...selection,
    ...expansion,
    ...modal,
    handleSave,
    handleDelete,
    handleBulkDelete,
    handleBulkAnalyze,
  };
}
