/**
 * Page Builder — MyDatesTableBlock.
 *
 * Self-contained CRUD table for managing dates.
 * Replaces the hardcoded MyDatesPage from web-platform-dev/src/pages/mydate/.
 *
 * Features:
 * - Fetches dates from /api/my-dates
 * - Search, column filters, sorting
 * - Bulk select, bulk delete, bulk compare
 * - Create/edit/delete via modal
 * - Tags with color chips
 * - Type badges
 *
 * @module packages/ui/src/blocks/MyDatesTableBlock
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

// ── Types ─────────────────────────────────────────────────────────

interface MyDate {
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

type SortField = "date" | "type" | "name" | "tags" | "notes" | "created_at";
type SortOrder = "asc" | "desc";
type ModalMode = "create" | "edit" | "view";

// ── API helpers ───────────────────────────────────────────────────

function getTelegramUserId(): number | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function fetchMyDates(): Promise<MyDate[]> {
  const userId = getTelegramUserId();
  if (!userId) return [];
  const res = await fetch("/api/my-dates", {
    headers: { "X-Telegram-User-Id": String(userId) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка завантаження");
  return data.dates;
}

async function saveMyDate(dateData: Partial<MyDate>): Promise<void> {
  const userId = getTelegramUserId();
  if (!userId) throw new Error("Not authenticated");
  const isCreate = !dateData.id;
  const res = await fetch("/api/my-dates", {
    method: isCreate ? "POST" : "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-User-Id": String(userId),
    },
    body: JSON.stringify(dateData),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка збереження");
}

async function deleteMyDate(id: string): Promise<void> {
  const userId = getTelegramUserId();
  if (!userId) throw new Error("Not authenticated");
  const res = await fetch(`/api/my-dates?id=${id}`, {
    method: "DELETE",
    headers: { "X-Telegram-User-Id": String(userId) },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка видалення");
}

async function deleteMyDates(ids: string[]): Promise<void> {
  const userId = getTelegramUserId();
  if (!userId) throw new Error("Not authenticated");
  const res = await fetch(`/api/my-dates?ids=${ids.join(",")}`, {
    method: "DELETE",
    headers: { "X-Telegram-User-Id": String(userId) },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Помилка видалення");
}

// ── Helpers ───────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  person: { label: "Людина", color: "#2563eb", bg: "#eff6ff" },
  event: { label: "Подія", color: "#059669", bg: "#ecfdf5" },
  other: { label: "Інше", color: "#7c3aed", bg: "#f5f3ff" },
};

const TAG_COLORS = [
  { color: "#b45309", bg: "#fef3c7" },
  { color: "#0e7490", bg: "#ecfeff" },
  { color: "#be185d", bg: "#fdf2f8" },
  { color: "#4338ca", bg: "#eef2ff" },
  { color: "#047857", bg: "#ecfdf5" },
  { color: "#c2410c", bg: "#fff7ed" },
  { color: "#7c3aed", bg: "#f5f3ff" },
  { color: "#0369a1", bg: "#f0f9ff" },
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.other;
}

function formatDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

// ── DateModal ─────────────────────────────────────────────────────

function DateModal({
  mode,
  date,
  allTags,
  onClose,
  onSave,
  onDelete,
}: {
  mode: ModalMode;
  date: MyDate | null;
  allTags: string[];
  onClose: () => void;
  onSave: (data: Partial<MyDate>) => void;
  onDelete?: (id: string) => void;
}) {
  const [name, setName] = useState(date?.name ?? "");
  const [dateVal, setDateVal] = useState(date?.date ?? "");
  const [type, setType] = useState(date?.type ?? "person");
  const [tags, setTags] = useState<string[]>(date?.tags ?? []);
  const [notes, setNotes] = useState(date?.notes ?? "");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const isReadonly = mode === "view";

  const handleSave = async () => {
    if (!dateVal) return;
    setSaving(true);
    try {
      await onSave({
        id: date?.id,
        name,
        date: dateVal,
        type,
        tags,
        notes,
      });
    } finally {
      setSaving(false);
    }
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {mode === "create" && "Нова дата"}
            {mode === "edit" && "Редагувати дату"}
            {mode === "view" && "Перегляд дати"}
          </h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Назва</label>
            <input
              className="wb-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ім'я або назва"
              disabled={isReadonly}
            />
          </div>
          <div className="form-group">
            <label>Дата *</label>
            <input
              type="date"
              className="wb-input"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              disabled={isReadonly}
              required
            />
          </div>
          <div className="form-group">
            <label>Тип</label>
            <select
              className="wb-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={isReadonly}
            >
              <option value="person">Людина</option>
              <option value="event">Подія</option>
              <option value="other">Інше</option>
            </select>
          </div>
          <div className="form-group">
            <label>Теги</label>
            <div className="tags-input">
              {tags.map((t) => (
                <span key={t} className="tag-chip" style={getTagColor(t)}>
                  {t}
                  {!isReadonly && (
                    <button className="tag-remove" onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>
                      ✕
                    </button>
                  )}
                </span>
              ))}
              {!isReadonly && (
                <input
                  className="wb-input tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Додати тег..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  onBlur={() => tagInput && addTag(tagInput)}
                />
              )}
            </div>
            {!isReadonly && allTags.length > 0 && (
              <div className="tag-suggestions">
                {allTags
                  .filter((t) => !tags.includes(t))
                  .slice(0, 8)
                  .map((t) => (
                    <button key={t} className="tag-chip tag-chip--sm" style={getTagColor(t)} onClick={() => addTag(t)}>
                      + {t}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Примітки</label>
            <textarea
              className="wb-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isReadonly}
            />
          </div>
        </div>
        <div className="modal-actions">
          {mode === "edit" && date && onDelete && (
            <button
              className="wb-btn wb-btn-danger"
              onClick={() => {
                if (confirm("Видалити цю дату?")) {
                  onDelete(date.id);
                }
              }}
            >
              Видалити
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="wb-btn wb-btn-secondary" onClick={onClose}>
            {isReadonly ? "Закрити" : "Скасувати"}
          </button>
          {!isReadonly && (
            <button className="wb-btn wb-btn-primary" onClick={handleSave} disabled={saving || !dateVal}>
              {saving ? "Зберігаємо..." : "Зберегти"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Block Component ──────────────────────────────────────────

export function MyDatesTableBlock({ block }: BlockComponentProps) {
  const {
    showSearch = true,
    showTypeFilter = true,
    showBulkActions = true,
    showCreateButton = true,
  } = block.props as {
    showSearch?: boolean;
    showTypeFilter?: boolean;
    showBulkActions?: boolean;
    showCreateButton?: boolean;
  };

  // Data
  const [dates, setDates] = useState<MyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalDate, setModalDate] = useState<MyDate | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────

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

  useEffect(() => {
    refreshDates();
  }, [refreshDates]);

  // ── Derived ───────────────────────────────────────────────────

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

  // ── Processed dates (filter + sort) ───────────────────────────

  const processedDates = useMemo(() => {
    let result = [...dates];

    // Search
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

    // Column filters
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

    // Sort
    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortField) {
        case "date":
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case "created_at":
          aVal = a.created_at || "";
          bVal = b.created_at || "";
          break;
        case "type":
          aVal = (a.type || "").toLowerCase();
          bVal = (b.type || "").toLowerCase();
          break;
        case "tags":
          aVal = (a.tags || []).join(", ").toLowerCase();
          bVal = (b.tags || []).join(", ").toLowerCase();
          break;
        case "notes":
          aVal = (a.notes || "").toLowerCase();
          bVal = (b.notes || "").toLowerCase();
          break;
        case "name":
        default:
          aVal = (a.name || "").toLowerCase();
          bVal = (b.name || "").toLowerCase();
          break;
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
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

  // ── CRUD handlers ─────────────────────────────────────────────

  const handleSave = useCallback(
    async (data: Partial<MyDate>) => {
      try {
        await saveMyDate(data);
        setModalMode(null);
        setModalDate(null);
        await refreshDates();
      } catch (e) {
        setError(`Помилка: ${String(e).slice(0, 100)}`);
      }
    },
    [refreshDates],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMyDate(id);
        setModalMode(null);
        setModalDate(null);
        await refreshDates();
      } catch (e) {
        setError(`Помилка: ${String(e).slice(0, 100)}`);
      }
    },
    [refreshDates],
  );

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
    const selectedDates = processedDates
      .filter((d) => selectedIds.has(d.id))
      .map((d) => d.date);
    // Navigate to compare page if available
    window.location.href = `/mydate/compare/systems?dates=${encodeURIComponent(selectedDates.join(","))}`;
  }, [selectedIds, processedDates]);

  // ── Column filter helpers ─────────────────────────────────────

  const toggleColumnFilter = useCallback((field: string, value: string) => {
    setColumnFilters((prev) => {
      const current = prev[field] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  }, []);

  const clearColumnFilter = useCallback((field: string) => {
    setColumnFilters((prev) => ({ ...prev, [field]: [] }));
  }, []);

  // ── Sort toggle ───────────────────────────────────────────────

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortOrder("asc");
      }
    },
    [sortField],
  );

  // ── Render ────────────────────────────────────────────────────

  const columns: { key: SortField; label: string }[] = [
    { key: "name", label: "Назва" },
    { key: "date", label: "Дата" },
    { key: "tags", label: "Теги" },
    { key: "type", label: "Тип" },
    { key: "notes", label: "Примітки" },
  ];

  return (
    <div className="wb-block-mydates-table">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          <h2 style={{ margin: 0 }}>Мої дати</h2>
          <span className="wb-text-sm wb-text-muted">
            {processedDates.length} з {dates.length}
          </span>
        </div>
        {showCreateButton && (
          <button className="wb-btn wb-btn-primary" onClick={() => { setModalMode("create"); setModalDate(null); }}>
            + Нова дата
          </button>
        )}
      </div>

      {/* Error */}
      {error && <p className="wb-text-sm" style={{ color: "var(--color-danger, #ef4444)" }}>{error}</p>}

      {/* Search */}
      {showSearch && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук..."
            className="wb-input"
            style={{ maxWidth: 400 }}
          />
        </div>
      )}

      {/* Active filters */}
      {Object.entries(columnFilters)
        .filter(([, v]) => v.length > 0)
        .map(([field, values]) => (
          <div key={field} style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
            <span className="wb-text-sm wb-text-muted">{field}:</span>
            {values.map((v) => (
              <button
                key={v}
                className="tag-chip tag-chip--sm"
                onClick={() => toggleColumnFilter(field, v)}
                style={{ cursor: "pointer" }}
              >
                {v} ✕
              </button>
            ))}
            <button className="wb-text-xs wb-text-muted" onClick={() => clearColumnFilter(field)}>
              Очистити
            </button>
          </div>
        ))}

      {/* Bulk actions */}
      {showBulkActions && selectedIds.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-3)",
            padding: "var(--sp-3)",
            background: "var(--bg-2, #f8fafc)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--sp-3)",
          }}
        >
          <span className="wb-text-sm">Обрано: {selectedIds.size}</span>
          {selectedIds.size >= 2 && (
            <button className="wb-btn wb-btn-sm" onClick={handleBulkCompare}>
              Співставити ({selectedIds.size})
            </button>
          )}
          <button className="wb-btn wb-btn-sm wb-btn-danger" onClick={handleBulkDelete}>
            Видалити ({selectedIds.size})
          </button>
          <button className="wb-btn wb-btn-sm wb-btn-secondary" onClick={() => setSelectedIds(new Set())}>
            Скасувати вибір
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && <p className="wb-text-sm wb-text-muted">Завантажуємо...</p>}

      {/* Empty state */}
      {!loading && dates.length === 0 && (
        <p className="wb-text-sm wb-text-muted">Поки що немає жодної дати. Додайте першу!</p>
      )}

      {/* Table */}
      {!loading && dates.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="wb-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={processedDates.length > 0 && selectedIds.size === processedDates.length}
                    onChange={toggleAll}
                  />
                </th>
                {columns.map((col) => (
                  <th key={col.key}>
                    <div
                      style={{ cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.label}
                      {sortField === col.key && (
                        <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                      )}
                      {showTypeFilter && col.key === "type" && (
                        <select
                          style={{ fontSize: 10, padding: 0, marginLeft: 4 }}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            if (e.target.value) toggleColumnFilter("type", e.target.value);
                            e.target.value = "";
                          }}
                          value=""
                        >
                          <option value="">+ фільтр</option>
                          {allTypes.map((t) => (
                            <option key={t} value={t}>
                              {getTypeConfig(t).label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedDates.map((d) => {
                const cfg = getTypeConfig(d.type);
                return (
                  <tr
                    key={d.id}
                    style={selectedIds.has(d.id) ? { background: "var(--bg-2, #f8fafc)" } : undefined}
                    onDoubleClick={() => { setModalMode("edit"); setModalDate(d); }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>{d.name || "—"}</td>
                    <td>{formatDate(d.date)}</td>
                    <td>
                      {(d.tags || []).length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {d.tags.map((tag) => (
                            <span key={tag} className="tag-chip tag-chip--sm" style={getTagColor(tag)}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span
                        className="wb-badge"
                        style={{ color: cfg.color, background: cfg.bg }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.notes || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* No results */}
      {!loading && dates.length > 0 && processedDates.length === 0 && (
        <p className="wb-text-sm wb-text-muted">Нічого не знайдено за фільтром</p>
      )}

      {/* Modal */}
      {modalMode && (
        <DateModal
          mode={modalMode}
          date={modalDate}
          allTags={allTags}
          onClose={() => { setModalMode(null); setModalDate(null); }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
