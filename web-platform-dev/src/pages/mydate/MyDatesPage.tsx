/**
 * MyDatesPage — основна сторінка "Мої дати".
 *
 * Рефакторинг: логіка винесена в хук useMyDates(),
 * компоненти — в DateModal, DateAccordionForm,
 * HeaderContextMenu, RowActionMenu.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app.store';
import { icons } from '@wwwuabot/shared';
import type { MyDate } from '@/shared/api/mydate.api';
import { useMyDates } from './useMyDates';
import { DateModal } from './DateModal';
import { DateAccordionForm } from './DateAccordionForm';
import { HeaderContextMenu } from './HeaderContextMenu';
import { RowActionMenu } from './RowActionMenu';
import { getTypeConfig, formatDate, type SortField, type ModalMode } from './mydate-types';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: string, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name as keyof typeof icons]}
  </span>
);

// ── Component ─────────────────────────────────────────────────────

export function MyDatesPage() {
  const setScenarioName = useAppStore((s) => s.setScenarioName);
  const hook = useMyDates();

  // Accordion
  const [formOpen, setFormOpen] = useState(() => {
    try {
      return localStorage.getItem('mydates_form_open') === 'true';
    } catch {
      return false;
    }
  });

  // Modals
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalDate, setModalDate] = useState<MyDate | null>(null);
  const [rowActionDate, setRowActionDate] = useState<MyDate | null>(null);

  // Header context menu
  const [headerMenu, setHeaderMenu] = useState<{
    field: SortField;
    mode: 'menu' | 'filter';
  } | null>(null);
  const [headerFilterText, setHeaderFilterText] = useState('');

  // ── Effects ─────────────────────────────────────────────────────

  useEffect(() => {
    setScenarioName('MyDate');
  }, [setScenarioName]);

  useEffect(() => {
    hook.refreshDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ────────────────────────────────────────────────────

  const toggleForm = useCallback(() => {
    const next = !formOpen;
    setFormOpen(next);
    try {
      localStorage.setItem('mydates_form_open', String(next));
    } catch {
      // localStorage недоступний (private mode) — стан просто не зберігається
    }
  }, [formOpen]);

  const handleAccordionSubmit = useCallback(async (data: Omit<MyDate, 'id' | 'created_at' | 'user_id' | 'updated_at'>) => {
    await hook.handleSave(data);
    setFormOpen(false);
    try {
      localStorage.setItem('mydates_form_open', 'false');
    } catch {
      // localStorage недоступний (private mode) — стан просто не зберігається
    }
    await hook.refreshDates();
  }, [hook]);

  const handleModalSave = useCallback(async (data: Partial<MyDate>) => {
    await hook.handleSave(data);
    setModalMode(null);
    setModalDate(null);
    await hook.refreshDates();
  }, [hook]);

  const handleModalDelete = useCallback(async (id: string) => {
    await hook.handleDelete(id);
    setModalMode(null);
    setModalDate(null);
    await hook.refreshDates();
  }, [hook]);

  const handleRowAction = useCallback((mode: ModalMode, date: MyDate) => {
    setModalMode(mode);
    setModalDate(date);
    setRowActionDate(null);
  }, []);

  const handleHeaderMenuSort = useCallback((field: SortField, order: 'asc' | 'desc') => {
    hook.setSortField(field);
    hook.setSortOrder(order);
    setHeaderMenu(null);
  }, [hook]);

  const handleHeaderMenuFilterToggle = useCallback((field: SortField, value: string) => {
    hook.setColumnFilters((prev) => {
      const current = prev[field] || [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
  }, [hook]);

  const handleHeaderMenuClear = useCallback((field: SortField) => {
    hook.setColumnFilters((prev) => ({ ...prev, [field]: [] }));
    if (hook.sortField === field) {
      hook.setSortField('name');
      hook.setSortOrder('asc');
    }
    setHeaderMenu(null);
    setHeaderFilterText('');
  }, [hook]);

  const getUniqueValues = useCallback((field: SortField): string[] => {
    if (field === 'type') return hook.allTypes;
    if (field === 'tags') return hook.allTags;
    if (field === 'name') return [...new Set(hook.dates.map((d) => d.name).filter(Boolean))].sort();
    if (field === 'notes') return [...new Set(hook.dates.map((d) => d.notes).filter(Boolean))].sort();
    return [];
  }, [hook.dates, hook.allTypes, hook.allTags]);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <main>
      <section className="hero">
        <div className="page-header">
          <h1>Мої дати</h1>
          <span className="date-count">
            {hook.processedDates.length} з {hook.dates.length}
          </span>
        </div>

        {/* Акордеон: Додати дату */}
        <DateAccordionForm
          isOpen={formOpen}
          onToggle={toggleForm}
          allTags={hook.allTags}
          onSubmit={handleAccordionSubmit}
        />

        {hook.error && <p className="status-text error">{hook.error}</p>}

        {/* Таблиця */}
        {!hook.loading && hook.dates.length > 0 && (
          <>
            {/* Фільтри */}
            <div className="table-filters">
              <input
                type="text"
                value={hook.searchQuery}
                onChange={(e) => hook.setSearchQuery(e.target.value)}
                placeholder="Пошук..."
                className="wb-input"
              />
              {Object.entries(hook.columnFilters)
                .filter(([, v]) => v.length > 0)
                .map(([field, values]) => (
                  <div key={field} className="active-filter-chips">
                    <span className="active-filter-label">
                      {field === 'type' ? 'Тип' : field === 'tags' ? 'Теги' : field === 'name' ? 'Назва' : field === 'notes' ? 'Примітки' : 'Дата'}:
                    </span>
                    {values.map((v) => (
                      <span
                        key={v}
                        className="active-filter-chip"
                        onClick={() =>
                          hook.setColumnFilters((prev) => ({
                            ...prev,
                            [field]: prev[field].filter((x) => x !== v),
                          }))
                        }
                      >
                        {v} {icons['close']}
                      </span>
                    ))}
                  </div>
                ))}
            </div>

            {/* Bulk actions */}
            {hook.selectedIds.size > 0 && (
              <div className="bulk-bar">
                <span className="bulk-count">Обрано: {hook.selectedIds.size}</span>
                <button
                  className="wb-btn wb-btn-sm wb-btn-compare"
                  onClick={hook.handleBulkCompare}
                  disabled={hook.selectedIds.size < 2}
                >
                  {ico('compare')} Співставити ({hook.selectedIds.size})
                </button>
                <button className="wb-btn wb-btn-sm wb-btn-danger" onClick={hook.handleBulkDelete}>
                  {ico('trash')} Видалити ({hook.selectedIds.size})
                </button>
                <button
                  className="wb-btn wb-btn-sm wb-btn-secondary"
                  onClick={() => hook.setSelectedIds(new Set())}
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
                          hook.processedDates.length > 0 && hook.selectedIds.size === hook.processedDates.length
                        }
                        onChange={hook.toggleAll}
                        className="row-checkbox"
                      />
                    </th>
                    {(['name', 'date', 'tags', 'type', 'notes'] as SortField[]).map((field) => {
                      const label =
                        field === 'name' ? 'Назва' : field === 'date' ? 'Дата' : field === 'tags' ? 'Теги' : field === 'type' ? 'Тип' : 'Примітки';
                      const isSticky = field === 'name';
                      return (
                        <th key={field} className={isSticky ? 'sticky-col-name' : ''}>
                          <div
                            className="th-content"
                            onClick={() => {
                              setHeaderMenu({ field, mode: 'menu' });
                              setHeaderFilterText('');
                            }}
                          >
                            {label}{' '}
                            {hook.sortField === field && (
                              <span className="sort-arrow">
                                {hook.sortOrder === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {hook.processedDates.map((d) => {
                    const cfg = getTypeConfig(d.type);
                    const typeLabel =
                      d.type === 'person' ? 'Людина' : d.type === 'event' ? 'Подія' : d.type === 'other' ? 'Інше' : d.type;
                    return (
                      <tr key={d.id} className={hook.selectedIds.has(d.id) ? 'selected' : ''}>
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
                            checked={hook.selectedIds.has(d.id)}
                            onChange={() => hook.toggleSelect(d.id)}
                            className="row-checkbox"
                          />
                        </td>
                        <td className="sticky-col-name name-cell">{d.name || '—'}</td>
                        <td className="date-cell">{formatDate(d.date)}</td>
                        <td className="tags-cell">
                          {(d.tags || []).length > 0 ? (
                            <div className="tags-inline">
                              {d.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="tag-chip tag-chip--sm"
                                  style={getTagColorLocal(tag)}
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
                        <td className="notes-cell" title={d.notes || ''}>
                          {d.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {hook.loading && <p className="status-text">Завантажуємо...</p>}
        {!hook.loading && hook.dates.length === 0 && (
          <p className="status-text">Поки що немає жодної дати. Додайте першу!</p>
        )}
        {!hook.loading && hook.dates.length > 0 && hook.processedDates.length === 0 && (
          <p className="status-text">Нічого не знайдено за фільтром</p>
        )}

        {/* Кнопка "Нова дата" внизу */}
        {hook.dates.length > 0 && !formOpen && (
          <button
            className="wb-btn wb-btn-add-bottom"
            onClick={() => {
              setModalMode('create');
              setModalDate(null);
            }}
          >
            ＋ Нова дата
          </button>
        )}

        {/* Header menu modal */}
        {headerMenu && (
          <HeaderContextMenu
            field={headerMenu.field}
            mode={headerMenu.mode}
            sortField={hook.sortField}
            sortOrder={hook.sortOrder}
            columnFilters={hook.columnFilters}
            filterText={headerFilterText}
            uniqueValues={getUniqueValues(headerMenu.field)}
            onSort={handleHeaderMenuSort}
            onFilterToggle={handleHeaderMenuFilterToggle}
            onClear={handleHeaderMenuClear}
            onSwitchToFilter={(field) => setHeaderMenu({ field, mode: 'filter' })}
            onFilterTextChange={setHeaderFilterText}
            onClose={() => setHeaderMenu(null)}
          />
        )}

        {/* Row action modal */}
        {rowActionDate && (
          <RowActionMenu
            date={rowActionDate}
            onAction={handleRowAction}
            onDelete={handleModalDelete}
            onClose={() => setRowActionDate(null)}
          />
        )}

        {/* Date modal */}
        {modalMode && (
          <DateModal
            mode={modalMode}
            date={modalDate}
            allTags={hook.allTags}
            onClose={() => {
              setModalMode(null);
              setModalDate(null);
            }}
            onSave={handleModalSave}
            onDelete={handleModalDelete}
            onSwitchToEdit={() => setModalMode('edit')}
          />
        )}
      </section>
    </main>
  );
}

// ── Local helpers ─────────────────────────────────────────────────

const TAG_COLORS = [
  { color: '#b45309', bg: '#fef3c7' },
  { color: '#0e7490', bg: '#ecfeff' },
  { color: '#be185d', bg: '#fdf2f8' },
  { color: '#4338ca', bg: '#eef2ff' },
  { color: '#047857', bg: '#ecfdf5' },
  { color: '#c2410c', bg: '#fff7ed' },
  { color: '#7c3aed', bg: '#f5f3ff' },
  { color: '#0369a1', bg: '#f0f9ff' },
];

function getTagColorLocal(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}
