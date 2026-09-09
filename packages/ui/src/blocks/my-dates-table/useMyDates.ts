/**
 * useMyDates — custom hook for dates CRUD, filtering, sorting, and selection.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { MyDate, SortField, SortOrder, ModalMode } from "./types";
import { fetchMyDates, saveMyDate, deleteMyDate, deleteMyDates } from "./api";
import { formatDate } from "./constants";

interface UseMyDatesOptions {
  showSearch?: boolean;
  showTypeFilter?: boolean;
  showBulkActions?: boolean;
  showCreateButton?: boolean;
}

interface UseMyDatesReturn {
  // Data
  dates: MyDate[];
  loading: boolean;
  error: string | null;
  processedDates: MyDate[];
  allTags: string[];
  allTypes: string[];

  // Sort
  sortField: SortField;
  sortOrder: SortOrder;
  toggleSort: (field: SortField) => void;

  // Filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  columnFilters: Record<string, string[]>;
  toggleColumnFilter: (field: string, value: string) => void;
  clearColumnFilter: (field: string) => void;

  // Selection
  selectedIds: Set<string>;
  toggleAll: () => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  // Modal
  modalMode: ModalMode | null;
  modalDate: MyDate | null;
  openCreate: () => void;
  openEdit: (date: MyDate) => void;
  closeModal: () => void;

  // CRUD
  handleSave: (data: Partial<MyDate>) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleBulkDelete: () => Promise<void>;
  handleBulkCompare: () => void;

  refreshDates: () => Promise<void>;
}

export function useMyDates(_options: UseMyDatesOptions = {}): UseMyDatesReturn {
  // Data
  const [dates, setDates] = useState<MyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sort
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalDate, setModalDate] = useState<MyDate | null>(null);

  // ── Fetch ──
  const refreshDates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMyDates();
      setDates(data);
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshDates(); }, [refreshDates]);

  // ── Derived ──
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    dates.forEach((d) => (d.tags || []).forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [dates]);

  const allTypes = useMemo(() => {
    const builtin = ["person", "event", "other"];
    const custom = dates.map((d) => d.type).filter((t) => t && !builtin.includes(t));
    return [...builtin, ...new Set(custom)];
  }, [dates]);

  // ── Processed dates (filter + sort) ──
  const processedDates = useMemo(() => {
    let result = [...dates];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(q) ||
          (d.notes || "").toLowerCase().includes(q) ||
          (d.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          formatDate(d.date).includes(q),
      );
    }

    for (const [field, values] of Object.entries(columnFilters)) {
      if (values.length === 0) continue;
      result = result.filter((d) => {
        let cellVal = "";
        if (field === "type") cellVal = d.type || "";
        else if (field === "tags") return (d.tags || []).some((t) => values.includes(t));
        else if (field === "name") cellVal = d.name || "";
        else if (field === "notes") cellVal = d.notes || "";
        else if (field === "date") cellVal = d.date || "";
        return values.includes(cellVal);
      });
    }

    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortField) {
        case "date": aVal = new Date(a.date).getTime(); bVal = new Date(b.date).getTime(); break;
        case "created_at": aVal = a.created_at || ""; bVal = b.created_at || ""; break;
        case "type": aVal = (a.type || "").toLowerCase(); bVal = (b.type || "").toLowerCase(); break;
        case "tags": aVal = (a.tags || []).join(", ").toLowerCase(); bVal = (b.tags || []).join(", ").toLowerCase(); break;
        case "notes": aVal = (a.notes || "").toLowerCase(); bVal = (b.notes || "").toLowerCase(); break;
        case "name": default: aVal = (a.name || "").toLowerCase(); bVal = (b.name || "").toLowerCase(); break;
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [dates, searchQuery, columnFilters, sortField, sortOrder]);

  // ── Selection ──
  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === processedDates.length) return new Set();
      return new Set(processedDates.map((d) => d.id));
    });
  }, [processedDates]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => { setSelectedIds(new Set()); }, []);

  // ── Modal ──
  const openCreate = useCallback(() => { setModalMode("create"); setModalDate(null); }, []);
  const openEdit = useCallback((date: MyDate) => { setModalMode("edit"); setModalDate(date); }, []);
  const closeModal = useCallback(() => { setModalMode(null); setModalDate(null); }, []);

  // ── CRUD ──
  const handleSave = useCallback(async (data: Partial<MyDate>) => {
    try {
      await saveMyDate(data);
      closeModal();
      await refreshDates();
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    }
  }, [refreshDates, closeModal]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMyDate(id);
      closeModal();
      await refreshDates();
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    }
  }, [refreshDates, closeModal]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Видалити ${selectedIds.size} дат?`)) return;
    try {
      await deleteMyDates([...selectedIds]);
      setSelectedIds(new Set());
      await refreshDates();
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    }
  }, [selectedIds, refreshDates]);

  const handleBulkCompare = useCallback(() => {
    if (selectedIds.size < 2) return;
    const selectedDates = processedDates.filter((d) => selectedIds.has(d.id)).map((d) => d.date);
    window.location.href = `/mydate/compare/systems?dates=${encodeURIComponent(selectedDates.join(","))}`;
  }, [selectedIds, processedDates]);

  // ── Filter helpers ──
  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortOrder("asc"); }
  }, [sortField]);

  const toggleColumnFilter = useCallback((field: string, value: string) => {
    setColumnFilters((prev) => {
      const current = prev[field] || [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
  }, []);

  const clearColumnFilter = useCallback((field: string) => {
    setColumnFilters((prev) => ({ ...prev, [field]: [] }));
  }, []);

  return {
    dates, loading, error, processedDates, allTags, allTypes,
    sortField, sortOrder, toggleSort,
    searchQuery, setSearchQuery, columnFilters, toggleColumnFilter, clearColumnFilter,
    selectedIds, toggleAll, toggleSelect, clearSelection,
    modalMode, modalDate, openCreate, openEdit, closeModal,
    handleSave, handleDelete, handleBulkDelete, handleBulkCompare,
    refreshDates,
  };
}
