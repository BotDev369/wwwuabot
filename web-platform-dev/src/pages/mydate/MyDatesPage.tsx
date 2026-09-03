import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/stores/app.store";
import {
  fetchMyDates,
  saveMyDate,
  deleteMyDate,
  deleteMyDates,
  type MyDate,
} from "@/shared/api/mydate.api";
import { icons, type IconName } from "@wwwuabot/shared";

const ico = (name: IconName, size = 16) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

/* ═══════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════ */

type SortField = "date" | "type" | "name" | "tags" | "notes" | "created_at";
type SortOrder = "asc" | "desc";
type ModalMode = "create" | "edit" | "view";

const TYPE_CONFIG: Record<string, { icon: IconName; color: string; bg: string }> = {
  person: { icon: "users", color: "#2563eb", bg: "#eff6ff" },
  event: { icon: "my-dates", color: "#059669", bg: "#ecfdf5" },
  other: { icon: "info", color: "#7c3aed", bg: "#f5f3ff" },
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
  return TYPE_CONFIG[type] || TYPE_CONFIG.other;
}

function formatDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function getCustomTypes(dates: MyDate[]): string[] {
  const builtins = ["person", "event", "other"];
  const custom = dates.map((d) => d.type).filter((t) => t && !builtins.includes(t));
  return [...new Set(custom)];
}

/* ═══════════════════════════════════════════════
   MODAL COMPONENT
   ═══════════════════════════════════════════════ */

function DateModal({
  mode,
  date,
  allTags,
  onClose,
  onSave,
  onDelete,
  onSwitchToEdit,
}: {
  mode: ModalMode;
  date: MyDate | null;
  allTags: string[];
  onClose: () => void;
  onSave: (data: Partial<MyDate>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSwitchToEdit: () => void;
}) {
  const [formDate, setFormDate] = useState(date?.date || "");
  const [formType, setFormType] = useState(date?.type || "person");
  const [formName, setFormName] = useState(date?.name || "");
  const [formTags, setFormTags] = useState<string[]>(date?.tags || []);
  const [formNotes, setFormNotes] = useState(date?.notes || "");
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const tagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return allTags.filter((t) => !formTags.includes(t)).slice(0, 8);
    const search = tagInput.toLowerCase();
    return allTags
      .filter((t) => t.toLowerCase().includes(search) && !formTags.includes(t))
      .slice(0, 8);
  }, [tagInput, allTags, formTags]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formTags.includes(trimmed)) {
      setFormTags([...formTags, trimmed]);
    }
    setTagInput("");
    setShowTagSuggestions(false);
    tagInputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    setFormTags(formTags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && formTags.length > 0) {
      setFormTags(formTags.slice(0, -1));
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onSave({
        id: date?.id,
        date: formDate,
        type: formType,
        name: formName,
        tags: formTags,
        notes: formNotes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!date?.id) return;
    if (!confirm("Видалити цю дату?")) return;
    await onDelete(date.id);
  };

  const isReadOnly = mode === "view";

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <h3>
            {mode === "create" && "Нова дата"}
            {mode === "edit" && "Редагувати дату"}
            {mode === "view" && (date?.name || formatDate(date?.date || ""))}
          </h3>
          <button className="wb-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="wb-modal-body">
          <div className="form-field">
            <label className="form-label">Дата *</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="wb-input"
              disabled={isReadOnly}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Тип</label>
            <div className="type-selector">
              {["person", "event", "other"].map((t) => {
                const cfg = getTypeConfig(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`wb-btn wb-btn-sm ${formType === t ? "wb-btn-primary" : "wb-btn-secondary"}`}
                    onClick={() => !isReadOnly && setFormType(t)}
                    disabled={isReadOnly}
                  >
                    {ico(cfg.icon)} {t === "person" ? "Людина" : t === "event" ? "Подія" : "Інше"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Назва / Псевдонім</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="напр. Олексій, Новий рік..."
              className="wb-input"
              disabled={isReadOnly}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Теги</label>
            <div className="tags-input-wrapper">
              {formTags.map((tag) => (
                <span key={tag} className="tag-chip" style={getTagColor(tag)}>
                  {tag}
                  {!isReadOnly && (
                    <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>
                      ×
                    </button>
                  )}
                </span>
              ))}
              {!isReadOnly && (
                <div className="tag-input-container">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(true);
                    }}
                    onFocus={() => setShowTagSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={formTags.length === 0 ? "Додайте теги..." : ""}
                    className="wb-input"
                  />
                  {showTagSuggestions && tagSuggestions.length > 0 && (
                    <div className="tag-suggestions">
                      {tagSuggestions.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="tag-suggestion-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addTag(tag);
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Примітки</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Додаткова інформація..."
              className="wb-textarea"
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="wb-modal-footer">
          {mode === "view" ? (
            <>
              <Link
                className="wb-btn wb-btn-sm wb-btn-analyze"
                to={`/mydate/${date?.date}`}
                onClick={onClose}
              >
                {ico("compare")} Аналіз
              </Link>
              <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={onSwitchToEdit}>
                {ico("edit")} Редагувати
              </button>
              <button className="wb-btn wb-btn-danger wb-btn-sm" onClick={handleDelete}>
                {ico("trash")} Видалити
              </button>
            </>
          ) : (
            <>
              <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={onClose} disabled={submitting}>
                Скасувати
              </button>
              <button
                className="wb-btn wb-btn-sm"
                onClick={handleSave}
                disabled={!formDate || submitting}
              >
                {submitting ? "Зберігаємо..." : mode === "create" ? "Додати" : "Зберегти"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

export function MyDatesPage() {
  const setScenarioName = useAppStore((s) => s.setScenarioName);
  const [dates, setDates] = useState<MyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({
    name: [],
    date: [],
    tags: [],
    type: [],
    notes: [],
  });

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Accordion
  const [formOpen, setFormOpen] = useState(() => {
    try {
      return localStorage.getItem("mydates_form_open") === "true";
    } catch {
      return false;
    }
  });

  // Form state
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState("person");
  const [formName, setFormName] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalDate, setModalDate] = useState<MyDate | null>(null);

  // Row action modal
  const [rowActionDate, setRowActionDate] = useState<MyDate | null>(null);

  // Header context menu
  const [headerMenu, setHeaderMenu] = useState<{
    field: SortField;
    mode: "menu" | "filter";
  } | null>(null);
  const [headerFilterText, setHeaderFilterText] = useState("");

  useEffect(() => {
    setScenarioName("MyDate");
  }, [setScenarioName]);

  // Fetch dates
  const fetchDates = useCallback(async () => {
    try {
      const data = await fetchMyDates();
      setDates(data);
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  // All unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    dates.forEach((d) => (d.tags || []).forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [dates]);

  // All unique types
  const allTypes = useMemo(() => {
    const builtins = ["person", "event", "other"];
    const custom = getCustomTypes(dates);
    return [...builtins, ...custom];
  }, [dates]);

  // Tag suggestions for accordion form
  const formTagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return allTags.filter((t) => !formTags.includes(t)).slice(0, 8);
    const search = tagInput.toLowerCase();
    return allTags
      .filter((t) => t.toLowerCase().includes(search) && !formTags.includes(t))
      .slice(0, 8);
  }, [tagInput, allTags, formTags]);

  // Processed dates (filter + sort)
  const processedDates = useMemo(() => {
    let result = [...dates];

    // Search filter
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

  // Accordion toggle
  const toggleForm = () => {
    const next = !formOpen;
    setFormOpen(next);
    try {
      localStorage.setItem("mydates_form_open", String(next));
    } catch {}
  };

  // Reset accordion form
  const resetForm = () => {
    setFormDate("");
    setFormType("person");
    setFormName("");
    setFormTags([]);
    setFormNotes("");
    setTagInput("");
  };

  // Add via accordion
  const handleAccordionAdd = async () => {
    if (!formDate) return;
    setSubmitting(true);
    try {
      await saveMyDate({
        date: formDate,
        type: formType,
        name: formName,
        tags: formTags,
        notes: formNotes,
      });
      resetForm();
      setFormOpen(false);
      try {
        localStorage.setItem("mydates_form_open", "false");
      } catch {}
      await fetchDates();
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Save from modal
  const handleModalSave = async (data: Partial<MyDate>) => {
    try {
      await saveMyDate(data);
      setModalMode(null);
      setModalDate(null);
      await fetchDates();
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    }
  };

  // Delete single
  const handleDelete = async (id: string) => {
    try {
      await deleteMyDate(id);
      setModalMode(null);
      setModalDate(null);
      await fetchDates();
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Видалити ${selectedIds.size} дат(у)?`)) return;
    try {
      await deleteMyDates([...selectedIds]);
      setSelectedIds(new Set());
      await fetchDates();
    } catch (e) {
      setError(`Помилка: ${String(e).slice(0, 100)}`);
    }
  };

  // Bulk compare
  const handleBulkCompare = () => {
    if (selectedIds.size < 2) return;
    const selectedDates = processedDates.filter((d) => selectedIds.has(d.id)).map((d) => d.date);
    window.location.href = `/mydate/compare/systems?dates=${encodeURIComponent(selectedDates.join(","))}`;
  };

  const handleHeaderMenuSort = (field: SortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
    setHeaderMenu(null);
  };

  const handleHeaderMenuFilterToggle = (field: SortField, value: string) => {
    setColumnFilters((prev) => {
      const current = prev[field] || [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const handleHeaderMenuClear = (field: SortField) => {
    setColumnFilters((prev) => ({ ...prev, [field]: [] }));
    if (sortField === field) {
      setSortField("name");
      setSortOrder("asc");
    }
    setHeaderMenu(null);
    setHeaderFilterText("");
  };

  const getUniqueValues = (field: SortField): string[] => {
    if (field === "type") return allTypes;
    if (field === "tags") return allTags;
    if (field === "name") return [...new Set(dates.map((d) => d.name).filter(Boolean))].sort();
    if (field === "notes") return [...new Set(dates.map((d) => d.notes).filter(Boolean))].sort();
    return [];
  };

  // Selection
  const toggleAll = () => {
    if (selectedIds.size === processedDates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedDates.map((d) => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Tag accordion helpers
  const addFormTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formTags.includes(trimmed)) setFormTags([...formTags, trimmed]);
    setTagInput("");
    setShowTagSuggestions(false);
    tagInputRef.current?.focus();
  };

  const removeFormTag = (tag: string) => setFormTags(formTags.filter((t) => t !== tag));

  const handleFormTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagInput.trim()) addFormTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && formTags.length > 0)
      setFormTags(formTags.slice(0, -1));
  };

  return (
    <main>
      <section className="hero">
        <div className="page-header">
          <h1>Мої дати</h1>
          <span className="date-count">
            {processedDates.length} з {dates.length}
          </span>
        </div>

        {/* ═══ АКОРДЕОН: Додати дату ═══ */}
        <div className={`accordion ${formOpen ? "open" : ""}`}>
          <button className="accordion-toggle" onClick={toggleForm}>
            <span className={`accordion-icon ${formOpen ? "rotated" : ""}`}>▶</span>
            {formOpen ? "Додати нову дату" : "＋ Додати дату"}
          </button>
          {formOpen && (
            <div className="accordion-content">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Дата *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="wb-input"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Тип</label>
                  <div className="type-selector">
                    {["person", "event", "other"].map((t) => {
                      const cfg = getTypeConfig(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`wb-btn wb-btn-sm ${formType === t ? "wb-btn-primary" : "wb-btn-secondary"}`}
                          onClick={() => setFormType(t)}
                        >
                          {ico(cfg.icon)} {t === "person" ? "Людина" : t === "event" ? "Подія" : "Інше"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Назва / Псевдонім</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="напр. Олексій..."
                    className="wb-input"
                  />
                </div>
                <div className="form-field full-width">
                  <label className="form-label">Теги</label>
                  <div className="tags-input-wrapper">
                    {formTags.map((tag) => (
                      <span key={tag} className="tag-chip" style={getTagColor(tag)}>
                        {tag}
                        <button
                          type="button"
                          className="tag-remove"
                          onClick={() => removeFormTag(tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <div className="tag-input-container">
                      <input
                        ref={tagInputRef}
                        type="text"
                        value={tagInput}
                        onChange={(e) => {
                          setTagInput(e.target.value);
                          setShowTagSuggestions(true);
                        }}
                        onFocus={() => setShowTagSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                        onKeyDown={handleFormTagKeyDown}
                        placeholder={formTags.length === 0 ? "Додайте теги..." : ""}
                        className="wb-input"
                      />
                      {showTagSuggestions && formTagSuggestions.length > 0 && (
                        <div className="tag-suggestions">
                          {formTagSuggestions.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              className="tag-suggestion-item"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                addFormTag(tag);
                              }}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="form-field full-width">
                  <label className="form-label">Примітки</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Додаткова інформація..."
                    className="wb-textarea"
                    rows={2}
                  />
                </div>
              </div>
              <button
                className="wb-btn wb-btn-sm"
                onClick={handleAccordionAdd}
                disabled={!formDate || submitting}
              >
                {submitting ? "Додаємо..." : "Додати дату"}
              </button>
            </div>
          )}
        </div>

        {error && <p className="status-text error">{error}</p>}

        {/* ═══ ТАБЛИЦЯ ═══ */}
        {!loading && dates.length > 0 && (
          <>
            {/* Фільтри */}
            <div className="table-filters">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук..."
                className="wb-input"
              />
              {Object.entries(columnFilters)
                .filter(([, v]) => v.length > 0)
                .map(([field, values]) => (
                  <div key={field} className="active-filter-chips">
                    <span className="active-filter-label">
                      {field === "type"
                        ? "Тип"
                        : field === "tags"
                          ? "Теги"
                          : field === "name"
                            ? "Назва"
                            : field === "notes"
                              ? "Примітки"
                              : "Дата"}
                      :
                    </span>
                    {values.map((v) => (
                      <span
                        key={v}
                        className="active-filter-chip"
                        onClick={() =>
                          setColumnFilters((prev) => ({
                            ...prev,
                            [field]: prev[field].filter((x) => x !== v),
                          }))
                        }
                      >
                        {v} ✕
                      </span>
                    ))}
                  </div>
                ))}
            </div>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <div className="bulk-bar">
                <span className="bulk-count">Обрано: {selectedIds.size}</span>
                <button
                  className="wb-btn wb-btn-sm wb-btn-compare"
                  onClick={handleBulkCompare}
                  disabled={selectedIds.size < 2}
                >
                  {ico("compare")} Співставити ({selectedIds.size})
                </button>
                <button className="wb-btn wb-btn-sm wb-btn-danger" onClick={handleBulkDelete}>
                  {ico("trash")} Видалити ({selectedIds.size})
                </button>
                <button
                  className="wb-btn wb-btn-sm wb-btn-secondary"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Скасувати вибір
                </button>
              </div>
            )}

            {/* Таблиця */}
            <div className="table-wrap">
              <table className="dates-table">
                <thead>
                  <tr>
                    <th className="sticky-col-menu"></th>
                    <th className="sticky-col-check">
                      <input
                        type="checkbox"
                        checked={
                          processedDates.length > 0 && selectedIds.size === processedDates.length
                        }
                        onChange={toggleAll}
                        className="row-checkbox"
                      />
                    </th>
                    {(["name", "date", "tags", "type", "notes"] as SortField[]).map((field) => {
                      const label =
                        field === "name"
                          ? "Назва"
                          : field === "date"
                            ? "Дата"
                            : field === "tags"
                              ? "Теги"
                              : field === "type"
                                ? "Тип"
                                : "Примітки";
                      const isSticky = field === "name";
                      return (
                        <th key={field} className={isSticky ? "sticky-col-name" : ""}>
                          <div
                            className="th-content"
                            onClick={() => {
                              setHeaderMenu({ field, mode: "menu" });
                              setHeaderFilterText("");
                            }}
                          >
                            {label}{" "}
                            {sortField === field && (
                              <span className="sort-arrow">
                                {sortOrder === "asc" ? "▲" : "▼"}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {processedDates.map((d) => {
                    const cfg = getTypeConfig(d.type);
                    const typeLabel =
                      d.type === "person"
                        ? "Людина"
                        : d.type === "event"
                          ? "Подія"
                          : d.type === "other"
                            ? "Інше"
                            : d.type;
                    return (
                      <tr key={d.id} className={selectedIds.has(d.id) ? "selected" : ""}>
                        <td className="sticky-col-menu">
                          <button
                            className="row-dropdown-toggle"
                            onClick={() => setRowActionDate(d)}
                          >
                            ⋮
                          </button>
                        </td>
                        <td className="sticky-col-check">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(d.id)}
                            onChange={() => toggleSelect(d.id)}
                            className="row-checkbox"
                          />
                        </td>
                        <td className="sticky-col-name name-cell">{d.name || "—"}</td>
                        <td className="date-cell">{formatDate(d.date)}</td>
                        <td className="tags-cell">
                          {(d.tags || []).length > 0 ? (
                            <div className="tags-inline">
                              {d.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="tag-chip tag-chip--sm"
                                  style={getTagColor(tag)}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="no-tags">—</span>
                          )}
                        </td>
                        <td className="type-cell">
                          <span
                            className="wb-badge wb-badge-accent"
                            style={{ color: cfg.color, background: cfg.bg }}
                          >
                            {ico(cfg.icon)} {typeLabel}
                          </span>
                        </td>
                        <td className="notes-cell" title={d.notes || ""}>
                          {d.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {loading && <p className="status-text">Завантажуємо...</p>}
        {!loading && dates.length === 0 && (
          <p className="status-text">Поки що немає жодної дати. Додайте першу!</p>
        )}
        {!loading && dates.length > 0 && processedDates.length === 0 && (
          <p className="status-text">Нічого не знайдено за фільтром</p>
        )}

        {/* Кнопка "Нова дата" внизу */}
        {dates.length > 0 && !formOpen && (
          <button
            className="wb-btn wb-btn-add-bottom"
            onClick={() => {
              setModalMode("create");
              setModalDate(null);
            }}
          >
            ＋ Нова дата
          </button>
        )}

        {/* ═══ HEADER MENU MODAL ═══ */}
        {headerMenu && (
          <div className="wb-modal-overlay" onClick={() => setHeaderMenu(null)}>
            <div className="header-modal" onClick={(e) => e.stopPropagation()}>
              <div className="header-modal-header">
                <span className="header-modal-title">
                  {headerMenu.field === "name"
                    ? "Назва"
                    : headerMenu.field === "date"
                      ? "Дата"
                      : headerMenu.field === "tags"
                        ? "Теги"
                        : headerMenu.field === "type"
                          ? "Тип"
                          : "Примітки"}
                </span>
                <button className="header-modal-close" onClick={() => setHeaderMenu(null)}>
                  ✕
                </button>
              </div>

              {headerMenu.mode === "menu" && (
                <div className="header-modal-body">
                  <button
                    className={`wb-btn wb-btn-ghost ${sortOrder === "asc" && sortField === headerMenu.field ? "wb-btn-primary" : ""}`}
                    onClick={() => handleHeaderMenuSort(headerMenu.field, "asc")}
                  >
                    ▲ А → Я
                  </button>
                  <button
                    className={`wb-btn wb-btn-ghost ${sortOrder === "desc" && sortField === headerMenu.field ? "wb-btn-primary" : ""}`}
                    onClick={() => handleHeaderMenuSort(headerMenu.field, "desc")}
                  >
                    ▼ Я → А
                  </button>
                  <div className="header-modal-divider" />
                  <button
                    className="wb-btn wb-btn-ghost"
                    onClick={() => setHeaderMenu({ field: headerMenu.field, mode: "filter" })}
                  >
                    {ico("eye")} Фільтр...
                  </button>
                  {(columnFilters[headerMenu.field]?.length > 0 ||
                    sortField === headerMenu.field) && (
                    <>
                      <div className="header-modal-divider" />
                      <button
                        className="wb-btn wb-btn-danger"
                        onClick={() => handleHeaderMenuClear(headerMenu.field)}
                      >
                        {ico("close")} Очистити
                      </button>
                    </>
                  )}
                </div>
              )}

              {headerMenu.mode === "filter" && (
                <div className="header-modal-body">
                  <input
                    className="wb-input"
                    type="text"
                    placeholder="Пошук у списках..."
                    value={headerFilterText}
                    onChange={(e) => setHeaderFilterText(e.target.value)}
                    autoFocus
                  />
                  <div className="header-modal-filter-list">
                    {getUniqueValues(headerMenu.field)
                      .filter(
                        (v) =>
                          !headerFilterText ||
                          v.toLowerCase().includes(headerFilterText.toLowerCase()),
                      )
                      .map((v) => {
                        const isSelected = (columnFilters[headerMenu.field] || []).includes(v);
                        return (
                          <label key={v} className="header-modal-filter-item">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleHeaderMenuFilterToggle(headerMenu.field, v)}
                            />
                            <span>{v}</span>
                          </label>
                        );
                      })}
                    {getUniqueValues(headerMenu.field).filter(
                      (v) =>
                        !headerFilterText ||
                        v.toLowerCase().includes(headerFilterText.toLowerCase()),
                    ).length === 0 && (
                      <div className="header-modal-empty">Нічого не знайдено</div>
                    )}
                  </div>
                  {(columnFilters[headerMenu.field]?.length || 0) > 0 && (
                    <button
                      className="wb-btn wb-btn-secondary"
                      onClick={() =>
                        setColumnFilters((prev) => ({ ...prev, [headerMenu.field]: [] }))
                      }
                    >
                      Скинути вибір
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ ROW ACTION MODAL ═══ */}
        {rowActionDate && (
          <div className="wb-modal-overlay" onClick={() => setRowActionDate(null)}>
            <div className="header-modal row-action-modal" onClick={(e) => e.stopPropagation()}>
              <div className="header-modal-header">
                <span className="header-modal-title">
                  {rowActionDate.name || rowActionDate.date}
                </span>
                <button className="header-modal-close" onClick={() => setRowActionDate(null)}>
                  ✕
                </button>
              </div>
              <div className="header-modal-body">
                <Link
                  className="wb-btn wb-btn-ghost"
                  to={`/mydate/${rowActionDate.date}`}
                  onClick={() => setRowActionDate(null)}
                >
                  {ico("compare")} Аналіз
                </Link>
                <button
                  className="wb-btn wb-btn-ghost"
                  onClick={() => {
                    setModalMode("view");
                    setModalDate(rowActionDate);
                    setRowActionDate(null);
                  }}
                >
                  {ico("eye")} Переглянути
                </button>
                <button
                  className="wb-btn wb-btn-ghost"
                  onClick={() => {
                    setModalMode("edit");
                    setModalDate(rowActionDate);
                    setRowActionDate(null);
                  }}
                >
                  {ico("edit")} Редагувати
                </button>
                <div className="header-modal-divider" />
                <button
                  className="wb-btn wb-btn-danger"
                  onClick={() => {
                    handleDelete(rowActionDate.id);
                    setRowActionDate(null);
                  }}
                >
                  {ico("trash")} Видалити
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ МОДАЛЬНЕ ВІКНО ═══ */}
        {modalMode && (
          <DateModal
            mode={modalMode}
            date={modalDate}
            allTags={allTags}
            onClose={() => {
              setModalMode(null);
              setModalDate(null);
            }}
            onSave={handleModalSave}
            onDelete={handleDelete}
            onSwitchToEdit={() => setModalMode("edit")}
          />
        )}
      </section>
    </main>
  );
}
