/**
 * Page Builder — MyDatesTableBlock.
 *
 * Self-contained CRUD table for managing dates.
 * Replaces the hardcoded MyDatesPage from web-platform-dev/src/pages/mydate/.
 *
 * @module packages/ui/src/blocks/MyDatesTableBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { useMyDates } from "./my-dates-table/useMyDates";
import { DateModal } from "./my-dates-table/DateModal";
import { formatDate, getTypeConfig, getTagColor } from "./my-dates-table/constants";

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

  const {
    dates, loading, error, processedDates, allTags, allTypes,
    sortField, sortOrder, toggleSort,
    searchQuery, setSearchQuery, columnFilters, toggleColumnFilter, clearColumnFilter,
    selectedIds, toggleAll, toggleSelect, clearSelection,
    modalMode, modalDate, openCreate, openEdit, closeModal,
    handleSave, handleDelete, handleBulkDelete, handleBulkCompare,
  } = useMyDates({ showSearch, showTypeFilter, showBulkActions, showCreateButton });

  const columns: { key: "name" | "date" | "tags" | "type" | "notes"; label: string }[] = [
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
          <button className="wb-btn wb-btn-primary" onClick={openCreate}>
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
            display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "var(--sp-3)",
            background: "var(--bg-2, #f8fafc)", borderRadius: "var(--radius-md)", marginBottom: "var(--sp-3)",
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
          <button className="wb-btn wb-btn-sm wb-btn-secondary" onClick={clearSelection}>
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
                      {sortField === col.key && <span>{sortOrder === "asc" ? "▲" : "▼"}</span>}
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
                            <option key={t} value={t}>{getTypeConfig(t).label}</option>
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
                    onDoubleClick={() => openEdit(d)}
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
                      ) : "—"}
                    </td>
                    <td>
                      <span className="wb-badge" style={{ color: cfg.color, background: cfg.bg }}>
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
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
