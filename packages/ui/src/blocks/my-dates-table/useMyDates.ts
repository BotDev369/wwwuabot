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
 * `useDateExpansion` і `useDateModal`, перетворення — у `filter-sort`,
 * запити — в `api`.
 *
 * @module packages/ui/src/blocks/my-dates-table/useMyDates
 */

import { useCallback, useEffect, useState } from "react";
import { useDialog } from "../../dialog";
import type { MyDate } from "./types";
import { deleteMyDate, deleteMyDates, fetchMyDates, saveMyDate } from "../mydate/api";
import { useDateExpansion } from "./useDateExpansion";
import { useDateFilters } from "./useDateFilters";
import { useDateModal } from "./useDateModal";
import { useDateSelection } from "./useDateSelection";
import type { UseMyDatesOptions, UseMyDatesReturn } from "./useMyDates.types";

export type { UseMyDatesOptions, UseMyDatesReturn } from "./useMyDates.types";

const errorText = (e: unknown) => `Помилка: ${String(e).slice(0, 100)}`;

/**
 * Співставлення — це кілька дат, і його перший крок спільний: адреса нижче
 * веде на вибір систем уже в процесі співставлення.
 */
function compareSystemsUrl(dates: MyDate[]): string {
  const param = encodeURIComponent(dates.map((d) => d.date).join(","));
  return `/mydate/compare/systems?dates=${param}`;
}

/**
 * Аналіз — це одна дата і **свій** процес: вибір систем і параметрів стоїть на
 * екрані аналізу, а не на екрані співставлення. Одна адреса на два процеси
 * вела в «співставлення дат» замість аналізу.
 */
function analysisUrl(date: string): string {
  return `/mydate/analysis?date=${encodeURIComponent(date)}`;
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
  const expansion = useDateExpansion();
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

  const handleBulkCompare = useCallback(() => {
    const selected = selectedDates();
    if (selected.length < 2) return;
    window.location.href = compareSystemsUrl(selected);
  }, [selectedDates]);

  // Аналіз веде **в аналіз**: далі екран сам спитає системи й параметри. Та сама
  // адреса в обох дій робила з аналізу співставлення.
  const handleBulkAnalyze = useCallback(() => {
    const selected = selectedDates();
    if (selected.length !== 1) return;
    window.location.href = analysisUrl(selected[0].date);
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
    handleBulkCompare,
  };
}
