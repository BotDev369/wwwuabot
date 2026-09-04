/**
 * HeaderContextMenu — контекстне меню заголовка таблиці (сортування/фільтр).
 */

import { icons } from '@wwwuabot/shared';
import type { SortField, SortOrder } from './mydate-types';
import { getFieldLabel } from './mydate-types';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: string, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name as keyof typeof icons]}
  </span>
);

// ── Props ─────────────────────────────────────────────────────────

interface HeaderContextMenuProps {
  field: SortField;
  mode: 'menu' | 'filter';
  sortField: SortField;
  sortOrder: SortOrder;
  columnFilters: Record<string, string[]>;
  filterText: string;
  uniqueValues: string[];
  onSort: (field: SortField, order: SortOrder) => void;
  onFilterToggle: (field: SortField, value: string) => void;
  onClear: (field: SortField) => void;
  onSwitchToFilter: (field: SortField) => void;
  onFilterTextChange: (text: string) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export function HeaderContextMenu({
  field,
  mode,
  sortField,
  sortOrder,
  columnFilters,
  filterText,
  uniqueValues,
  onSort,
  onFilterToggle,
  onClear,
  onSwitchToFilter,
  onFilterTextChange,
  onClose,
}: HeaderContextMenuProps) {
  const fieldLabel = getFieldLabel(field);

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="header-modal" onClick={(e) => e.stopPropagation()}>
        <div className="header-modal-header">
          <span className="header-modal-title">{fieldLabel}</span>
          <button className="wb-close-btn" onClick={onClose}>
            {icons['close']}
          </button>
        </div>

        {mode === 'menu' && (
          <div className="header-modal-body">
            <button
              className={`wb-btn wb-btn-ghost ${sortOrder === 'asc' && sortField === field ? 'wb-btn-primary' : ''}`}
              onClick={() => onSort(field, 'asc')}
            >
              ▲ А → Я
            </button>
            <button
              className={`wb-btn wb-btn-ghost ${sortOrder === 'desc' && sortField === field ? 'wb-btn-primary' : ''}`}
              onClick={() => onSort(field, 'desc')}
            >
              ▼ Я → А
            </button>
            <div className="header-modal-divider" />
            <button
              className="wb-btn wb-btn-ghost"
              onClick={() => onSwitchToFilter(field)}
            >
              {ico('eye')} Фільтр...
            </button>
            {(columnFilters[field]?.length > 0 || sortField === field) && (
              <>
                <div className="header-modal-divider" />
                <button
                  className="wb-btn wb-btn-danger"
                  onClick={() => onClear(field)}
                >
                  {ico('close')} Очистити
                </button>
              </>
            )}
          </div>
        )}

        {mode === 'filter' && (
          <div className="header-modal-body">
            <input
              className="wb-input"
              type="text"
              placeholder="Пошук у списках..."
              value={filterText}
              onChange={(e) => onFilterTextChange(e.target.value)}
              autoFocus
            />
            <div className="header-modal-filter-list">
              {uniqueValues
                .filter(
                  (v) =>
                    !filterText ||
                    v.toLowerCase().includes(filterText.toLowerCase()),
                )
                .map((v) => {
                  const isSelected = (columnFilters[field] || []).includes(v);
                  return (
                    <label key={v} className="header-modal-filter-item">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onFilterToggle(field, v)}
                      />
                      <span>{v}</span>
                    </label>
                  );
                })}
              {uniqueValues.filter(
                (v) =>
                  !filterText ||
                  v.toLowerCase().includes(filterText.toLowerCase()),
              ).length === 0 && (
                <div className="header-modal-empty">Нічого не знайдено</div>
              )}
            </div>
            {(columnFilters[field]?.length || 0) > 0 && (
              <button
                className="wb-btn wb-btn-secondary"
                onClick={() => onClear(field)}
              >
                Скинути вибір
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
