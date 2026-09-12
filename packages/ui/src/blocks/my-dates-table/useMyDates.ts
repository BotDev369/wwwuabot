/**
 * useMyDates — єдиний хук «Моїх дат»: завантаження, фільтри, сортування,
 * вибір рядків, CRUD і стан модалки.
 *
 * Його використовують і Page Builder-блок (`MyDatesTableBlock`), і сторінка
 * `web-platform-dev/src/pages/mydate/MyDatesPage`. Другої реалізації бути не
 * повинно: саме через неї один баг доводилось правити у двох місцях
 * (docs/CONSOLIDATION_LOG.md §3.3).
 *
 * Цей файл — лише композиція: стан живе у `useDateFilters`, `useDateSelection`
 * і `useDateModal`, перетворення — у `filter-sort`, запити — в `api`.
 *
 * @module packages/ui/src/blocks/my-dates-table/useMyDates
 */

import { useCallback, useEffect, useState } from "react";
import { useDialog } from "../../dialog";
import type { MyDate } from "./types";
import { deleteMyDate, deleteMyDates, fetchMyDates, saveMyDate } from "./api";
import { useDateFilters } from "./useDateFilters";
import { useDateModal } from "./useDateModal";
import { useDateSelection } from "./useDateSelection";
import type { UseMyDatesOptions, UseMyDatesReturn } from "./useMyDates.types";

export type { UseMyDatesOptions, UseMyDatesReturn } from "./useMyDates.types";

const errorText = (e: unknown) => `Помилка: ${String(e).slice(0, 100)}`;

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

  const handleBulkCompare = useCallback(() => {
    const selected = filters.processedDates.filter((d) => selection.selectedIds.has(d.id));
    if (selected.length < 2) return;
    const param = encodeURIComponent(selected.map((d) => d.date).join(","));
    window.location.href = `/mydate/compare/systems?dates=${param}`;
  }, [filters.processedDates, selection.selectedIds]);

  return {
    dates,
    loading,
    error,
    refreshDates,
    ...filters,
    ...selection,
    ...modal,
    handleSave,
    handleDelete,
    handleBulkDelete,
    handleBulkCompare,
  };
}
