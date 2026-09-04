/**
 * useMyDates — хук для отримання, фільтрації та сортування дат.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  fetchMyDates,
  saveMyDate,
  deleteMyDate,
  deleteMyDates,
  type MyDate,
} from '@/shared/api/mydate.api';
import { type SortField, type SortOrder, formatDate, getAllTypes } from './mydate-types';

// ── Return type ───────────────────────────────────────────────────

export interface UseMyDatesReturn {
  // Data
  dates: MyDate[];
  processedDates: MyDate[];
  loading: boolean;
  error: string | null;

  // Derived
  allTags: string[];
  allTypes: string[];

  // Sorting
  sortField: SortField;
  sortOrder: SortOrder;
  setSortField: (f: SortField) => void;
  setSortOrder: (o: SortOrder) => void;

  // Filtering
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  columnFilters: Record<string, string[]>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;

  // Selection
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleAll: () => void;
  toggleSelect: (id: string) => void;

  // CRUD
  refreshDates: () => Promise<void>;
  handleSave: (data: Partial<MyDate>) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleBulkDelete: () => Promise<void>;
  handleBulkCompare: () => void;
  setError: (e: string | null) => void;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useMyDates(): UseMyDatesReturn {
  const [dates, setDates] = useState<MyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({
    name: [],
    date: [],
    tags: [],
    type: [],
    notes: [],
  });

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Fetch ─────────────────────────────────────────────────────

  const refreshDates = useCallback(async () => {
    try {
      const data = await fetchMyDates();
      setDates(data);
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Derived ───────────────────────────────────────────────────

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    dates.forEach((d) => (d.tags || []).forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [dates]);

  const allTypes = useMemo(() => getAllTypes(dates), [dates]);

  // ── Processed dates (filter + sort) ───────────────────────────

  const processedDates = useMemo(() => {
    let result = [...dates];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.notes || '').toLowerCase().includes(q) ||
          (d.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          formatDate(d.date).includes(q),
      );
    }

    // Column filters
    for (const [field, values] of Object.entries(columnFilters)) {
      if (values.length === 0) continue;
      result = result.filter((d) => {
        let cellVal = '';
        if (field === 'type') cellVal = d.type || '';
        else if (field === 'tags') return (d.tags || []).some((t) => values.includes(t));
        else if (field === 'name') cellVal = d.name || '';
        else if (field === 'notes') cellVal = d.notes || '';
        else if (field === 'date') cellVal = d.date || '';
        return values.includes(cellVal);
      });
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'date':
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
        case 'type':
          aVal = (a.type || '').toLowerCase();
          bVal = (b.type || '').toLowerCase();
          break;
        case 'tags':
          aVal = (a.tags || []).join(', ').toLowerCase();
          bVal = (b.tags || []).join(', ').toLowerCase();
          break;
        case 'notes':
          aVal = (a.notes || '').toLowerCase();
          bVal = (b.notes || '').toLowerCase();
          break;
        case 'name':
        default:
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [dates, searchQuery, columnFilters, sortField, sortOrder]);

  // ── Selection ─────────────────────────────────────────────────

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === processedDates.length) return new Set();
      return new Set(processedDates.map((d) => d.id));
    });
  }, [processedDates]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── CRUD ──────────────────────────────────────────────────────

  const handleSave = useCallback(async (data: Partial<MyDate>) => {
    try {
      await saveMyDate(data);
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMyDate(id);
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Видалити ${selectedIds.size} дат(у)?`)) return;
    try {
      await deleteMyDates([...selectedIds]);
      setSelectedIds(new Set());
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    }
  }, [selectedIds]);

  const handleBulkCompare = useCallback(() => {
    if (selectedIds.size < 2) return;
    const selectedDates = processedDates.filter((d) => selectedIds.has(d.id)).map((d) => d.date);
    window.location.href = `/mydate/compare/systems?dates=${encodeURIComponent(selectedDates.join(','))}`;
  }, [selectedIds, processedDates]);

  return {
    dates,
    processedDates,
    loading,
    error,
    allTags,
    allTypes,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    columnFilters,
    setColumnFilters,
    selectedIds,
    setSelectedIds,
    toggleAll,
    toggleSelect,
    refreshDates,
    handleSave,
    handleDelete,
    handleBulkDelete,
    handleBulkCompare,
    setError,
  };
}
