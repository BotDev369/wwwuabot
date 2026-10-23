/**
 * Список на читання («Шаблони», «Публічні») — той самий акордеон, що в
 * «Моїх»: залитий заголовок групи з рахунком, рядки під ним. Дія рядка —
 * «Додати», дія заголовка — додати всю групу однією копією; під час пошуку
 * групи розгорнуті, щоб збіг було видно.
 *
 * @module web-platform-dev/src/pages/trackers/TrackersLibraryPanel
 */

import { useMemo, useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";
import { filterLibrary, groupLibrary, type TrackerLibraryItem } from "./tracker-library";

interface TrackersLibraryPanelProps {
  items: readonly TrackerLibraryItem[];
  loading: boolean;
  error: string | null;
  /** Порожній список без пошуку — не «нічого не знайдено», а «ще немає». */
  emptyText: string;
  isOpen: (title: string) => boolean;
  onToggle: (title: string) => void;
  onAdd: (source: string) => Promise<boolean>;
  /** «Додати всю групу»: усі джерела однією відповіддю сервера. */
  onAddMany: (sources: readonly string[]) => Promise<boolean>;
  onRetry: () => void;
}

interface GroupMenu {
  title: string;
  sources: string[];
}

export function TrackersLibraryPanel({
  items,
  loading,
  error,
  emptyText,
  isOpen,
  onToggle,
  onAdd,
  onAddMany,
  onRetry,
}: TrackersLibraryPanelProps): ReactElement {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [menu, setMenu] = useState<GroupMenu | null>(null);
  const visible = useMemo(() => filterLibrary(items, query), [items, query]);
  const groups = useMemo(() => groupLibrary(visible), [visible]);
  const searching = query.trim().length > 0;

  async function add(source: string): Promise<void> {
    if (adding !== null) return;
    setAdding(source);
    try {
      await onAdd(source);
    } finally {
      setAdding(null);
    }
  }

  async function addAll(sources: readonly string[]): Promise<void> {
    if (addingAll || sources.length === 0) return;
    setAddingAll(true);
    try {
      await onAddMany(sources);
    } finally {
      setAddingAll(false);
    }
  }

  function openMenu(title: string, items: readonly TrackerLibraryItem[]): void {
    setMenu({ title, sources: items.filter((item) => !item.added).map((item) => item.source) });
  }

  return (
    <div className="wb-library">
      <input
        className="wb-input wb-library-search"
        type="search"
        value={query}
        placeholder="Пошук"
        aria-label="Пошук трекера"
        onChange={(event) => setQuery(event.target.value)}
      />

      {loading && <p className="wb-text-muted">Завантаження…</p>}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-empty-text">{error}</p>
          <button className="wb-btn wb-btn-secondary" onClick={onRetry}>
            Повторити
          </button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className="wb-text-muted">{query.trim() ? "Нічого не знайдено." : emptyText}</p>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="wb-library-tree">
          {groups.map((group, index) => {
            const titleId = `tracker-library-group-${index}`;
            const open = searching || isOpen(group.title);
            const fresh = group.items.some((item) => !item.added);
            return (
              <section key={group.title} className="wb-group" aria-labelledby={titleId}>
                <div className="wb-group-head">
                  <button
                    type="button"
                    className="wb-group-toggle"
                    aria-expanded={open}
                    aria-labelledby={titleId}
                    onClick={() => onToggle(group.title)}
                  >
                    <Icon name={open ? "chevron-down" : "chevron-right"} size={16} />
                    <span id={titleId} className="wb-group-title">
                      {group.title}
                    </span>
                    <span className="wb-group-count">{group.items.length}</span>
                  </button>
                  {/* Меню — лише коли є що додавати: «усі вже в «Моїх»» — це
                      не дія, а порожній пункт. */}
                  {fresh && (
                    <button
                      type="button"
                      className="wb-group-actions"
                      aria-label={`Дії групи ${group.title}`}
                      onClick={() => openMenu(group.title, group.items)}
                    >
                      <Icon name="more" size={18} />
                    </button>
                  )}
                </div>
                {open && (
                  <ul className="wb-library-list">
                    {group.items.map((item) => (
                      <li key={item.key} className="wb-library-row">
                        <span className="wb-library-icon">
                          <Icon name={item.icon} size={16} />
                        </span>
                        <span className="wb-library-text">
                          <span className="wb-library-title">{item.title}</span>
                          <span className="wb-library-meta">{item.meta}</span>
                        </span>
                        <button
                          type="button"
                          className={
                            "wb-btn wb-library-add" +
                            (item.added ? " wb-btn-ghost" : " wb-btn-secondary")
                          }
                          disabled={item.added || adding === item.source || addingAll}
                          onClick={() => void add(item.source)}
                        >
                          {item.added ? "Додано" : "Додати"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {menu && (
        <MenuModal
          title={menu.title}
          variant="card"
          onClose={() => setMenu(null)}
          items={[
            {
              key: "all",
              label: `Додати всю групу (${menu.sources.length})`,
              icon: "plus",
              onSelect: () => {
                const sources = menu.sources;
                setMenu(null);
                void addAll(sources);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
