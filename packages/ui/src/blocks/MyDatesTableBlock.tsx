/**
 * Page Builder — MyDatesTableBlock.
 *
 * Self-contained CRUD table for managing dates.
 * Replaces the hardcoded MyDatesPage from web-platform-dev/src/pages/mydate/.
 *
 * @module packages/ui/src/blocks/MyDatesTableBlock
 */

import { Icon, icons } from "@wwwuabot/shared";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { CollapsibleSection } from "./collapsible-section";
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
    dates,
    loading,
    error,
    processedDates,
    allTags,
    allTypes,
    sortField,
    sortOrder,
    toggleSort,
    searchQuery,
    setSearchQuery,
    columnFilters,
    toggleColumnFilter,
    clearColumnFilter,
    selectedIds,
    toggleAll,
    toggleSelect,
    clearSelection,
    isExpanded,
    toggleExpanded,
    modalMode,
    modalDate,
    openCreate,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
    handleBulkDelete,
    handleBulkAnalyze,
  } = useMyDates();

  // Дата — перша колонка, і це не смак: назва може бути порожньою, а дата є
  // завжди, тож саме вона впізнає рядок. Картка на телефоні тримає той самий
  // порядок — одна модель, два подання.
  const columns: { key: "date" | "name" | "tags" | "type" | "notes"; label: string }[] = [
    { key: "date", label: "Дата" },
    { key: "name", label: "Назва" },
    { key: "tags", label: "Теги" },
    { key: "type", label: "Тип" },
    { key: "notes", label: "Примітки" },
  ];

  return (
    <>
      <CollapsibleSection
        title="Дати"
        /* «7 з 7» без фільтра ні про що; лічильник потрібен лише тоді, коли
         список звузили пошуком або фільтром. */
        meta={
          processedDates.length === dates.length
            ? dates.length
            : `${processedDates.length} з ${dates.length}`
        }
      >
        {/* Створення — дія блока, а не його назва: у підписі акордеона кнопка
          читалась частиною підпису («Дати · Нова дата») і стискала його.
          Пошук стоїть у тому самому рядку: обидва стосуються списку, а два
          рядки забирали висоту екрана, якої на телефоні й так мало. */}
        {(showCreateButton || showSearch) && (
          <div className="wb-date-tools">
            {showCreateButton && (
              <button className="wb-btn wb-btn-primary" onClick={openCreate}>
                Нова дата
              </button>
            )}
            {showSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук..."
                className="wb-input wb-date-tools__search"
              />
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="wb-text-sm" style={{ color: "var(--color-danger, #ef4444)" }}>
            {error}
          </p>
        )}

        {/* Active filters */}
        {Object.entries(columnFilters)
          .filter(([, v]) => v.length > 0)
          .map(([field, values]) => (
            <div
              key={field}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-2)",
                marginBottom: "var(--sp-2)",
              }}
            >
              <span className="wb-text-sm wb-text-muted">{field}:</span>
              {values.map((v) => (
                <button
                  key={v}
                  className="wb-chip wb-chip-sm"
                  onClick={() => toggleColumnFilter(field, v)}
                  style={{ cursor: "pointer" }}
                >
                  {v} {icons["close"]}
                </button>
              ))}
              <button className="wb-text-xs wb-text-muted" onClick={() => clearColumnFilter(field)}>
                Очистити
              </button>
            </div>
          ))}

        {/* Bulk actions */}
        {showBulkActions && selectedIds.size > 0 && (
          <div className="wb-date-bulk">
            <span className="wb-text-sm wb-date-bulk__count">Обрано: {selectedIds.size}</span>
            {/* Одна кнопка на будь-яку кількість дат: аналіз — це таблиця, де дат
              може бути одна або більше, тож окремої дії для кількох немає. */}
            <button className="wb-btn wb-btn-sm wb-btn-primary" onClick={handleBulkAnalyze}>
              Аналізувати ({selectedIds.size})
            </button>
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

        {/* Сортування для вузького екрана: там заголовки колонок приховані
          (у картки кожне поле підписане), тож лишається одне поле вибору. */}
        {!loading && dates.length > 0 && (
          <div className="wb-date-sort">
            <span className="wb-text-sm wb-text-muted">Сортування</span>
            <select
              className="wb-input"
              value={sortField}
              onChange={(e) => toggleSort(e.target.value as (typeof columns)[number]["key"])}
            >
              {columns.map((col) => (
                <option key={col.key} value={col.key}>
                  {col.label}
                </option>
              ))}
            </select>
            <button className="wb-btn wb-btn-secondary" onClick={() => toggleSort(sortField)}>
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
            <select
              className="wb-input"
              value=""
              onChange={(e) => {
                if (e.target.value) toggleColumnFilter("type", e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Тип: усі</option>
              {allTypes.map((t) => (
                <option key={t} value={t}>
                  {getTypeConfig(t).label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Table */}
        {!loading && dates.length > 0 && (
          <div className="wb-date-list">
            <table className="wb-table" style={{ width: "100%" }}>
              <thead>
                <tr className="wb-date-head">
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={
                        processedDates.length > 0 && selectedIds.size === processedDates.length
                      }
                      onChange={toggleAll}
                    />
                  </th>
                  {columns.map((col) => (
                    <th key={col.key}>
                      <div
                        style={{
                          cursor: "pointer",
                          userSelect: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
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
                  const open = isExpanded(d.id);
                  return (
                    <tr
                      key={d.id}
                      className={`wb-date-row${open ? " wb-date-row--open" : ""}`}
                      style={
                        selectedIds.has(d.id) ? { background: "var(--bg-2, #f8fafc)" } : undefined
                      }
                      onDoubleClick={() => openEdit(d)}
                    >
                      <td className="wb-date-cell wb-date-cell--pick">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(d.id)}
                          onChange={() => toggleSelect(d.id)}
                        />
                      </td>
                      {/* Дату в картці показує голова, тож окремої комірки в ній
                        немає — інакше той самий факт стояв би двічі. */}
                      <td className="wb-date-cell wb-date-cell--date" data-label="Дата">
                        {formatDate(d.date)}
                      </td>
                      {/* Голова картки — **кнопка на всю ширину**: спершу дата (вона
                        є завжди), потім назва, а тіло з'являється під нею. */}
                      <td className="wb-date-cell wb-date-cell--name" data-label="">
                        <div className="wb-date-name-row">
                          <button
                            type="button"
                            className="wb-date-name"
                            aria-expanded={open}
                            onClick={() => toggleExpanded(d.id)}
                          >
                            <span className="wb-date-name__meta">{formatDate(d.date)}</span>
                            <span className="wb-date-name__text">{d.name || "—"}</span>
                            <span className="wb-date-name__caret">
                              <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
                            </span>
                          </button>
                          {/* У таблиці акордеона немає (усі поля й так у колонках),
                            тож правка тут — окремою кнопкою; у картці її несе тіло. */}
                          <button
                            type="button"
                            className="wb-date-edit"
                            aria-label={`Редагувати ${d.name}`}
                            onClick={() => openEdit(d)}
                          >
                            <Icon name="edit" size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="wb-date-cell wb-date-cell--body" data-label="Теги">
                        {(d.tags || []).length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {d.tags.map((tag) => (
                              <span
                                key={tag}
                                className="wb-chip wb-chip-sm"
                                style={getTagColor(tag)}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="wb-date-cell wb-date-cell--body" data-label="Тип">
                        <span className="wb-badge" style={{ color: cfg.color, background: cfg.bg }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td
                        className="wb-date-cell wb-date-cell--notes wb-date-cell--body"
                        data-label="Примітки"
                      >
                        {d.notes || "—"}
                      </td>
                      {/* Дії відкритої картки: у таблиці ця комірка схована — там
                        правку несе кнопка в голові рядка. */}
                      <td
                        className="wb-date-cell wb-date-cell--actions wb-date-cell--body"
                        data-label=""
                      >
                        <div className="wb-sheet-actions">
                          <button
                            type="button"
                            className="wb-btn wb-btn-primary"
                            onClick={() => openEdit(d)}
                          >
                            <Icon name="edit" size={16} />
                            Редагувати
                          </button>
                        </div>
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
      </CollapsibleSection>

      {/* Модалка — поверхня, а не вміст блока: згортання її не чіпає. */}
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
    </>
  );
}
