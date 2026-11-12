/**
 * «Платформа» — сторінки вебу з таблиці `platform_pages`: список і картка правки.
 * Поля екрана бота живуть у `bot_scenarios` і мають власний екран.
 *
 * @module web-admin-dev/src/pages/platform/PlatformPagesPage
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageTopbar } from "../../layout/PageTopbar";
import {
  listPlatformPages,
  readPlatformPage,
  updatePlatformPage,
  type PlatformPageListItem,
  type PlatformPageRecord,
} from "../../shared/api/scenarios-admin.api";

type Status = "loading" | "idle" | "error";

interface PageDraft {
  id: number;
  slug: string;
  title: string;
  photo_url: string;
  template_key: string;
  page_data: string;
  is_public: boolean;
  is_active: boolean;
}

function draftOf(record: PlatformPageRecord): PageDraft {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title ?? "",
    photo_url: record.photo_url ?? "",
    template_key: record.template_key ?? "",
    page_data: record.page_data ?? "",
    is_public: Number(record.is_public ?? 0) === 1,
    is_active: Number(record.is_active ?? 1) === 1,
  };
}

export function PlatformPagesPage() {
  const [items, setItems] = useState<PlatformPageListItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<PageDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await listPlatformPages());
      setStatus("idle");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- асинхронне завантаження: setState усередині load()
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) => item.slug.toLowerCase().includes(q) || (item.title ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  async function open(id: number): Promise<void> {
    const record = await readPlatformPage(id);
    if (record) {
      setSaveError("");
      setDraft(draftOf(record));
    }
  }

  function change<K extends keyof PageDraft>(key: K, value: PageDraft[K]): void {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save(): Promise<void> {
    if (!draft) return;
    setSaving(true);
    setSaveError("");
    try {
      await updatePlatformPage(draft.id, {
        slug: draft.slug,
        title: draft.title,
        photo_url: draft.photo_url,
        template_key: draft.template_key,
        page_data: draft.page_data,
        is_public: draft.is_public ? 1 : 0,
        is_active: draft.is_active ? 1 : 0,
      });
      setDraft(null);
      await load();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageTopbar>
        <div className="wb-topbar-left">
          <h1 className="wb-topbar-title">Платформа</h1>
          {items.length > 0 && <span className="wb-count">{items.length}</span>}
        </div>
        <div className="wb-topbar-right">
          <input
            type="text"
            className="wb-input wb-search"
            placeholder="Пошук за адресою або назвою…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </PageTopbar>

      <div className="wb-page-body">
        {status === "loading" ? (
          <div className="empty-state">
            <p className="empty-state-text">Завантаження сторінок платформи…</p>
          </div>
        ) : status === "error" ? (
          <div className="empty-state">
            <p className="empty-state-text">Не вдалося завантажити: {error}</p>
            <button
              className="wb-btn wb-btn-secondary"
              onClick={() => {
                setStatus("loading");
                void load();
              }}
            >
              Спробувати ще
            </button>
          </div>
        ) : (
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  <th>Адреса</th>
                  <th>Назва</th>
                  <th>Шаблон</th>
                  <th>Публічна</th>
                  <th>Оновлено</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="wb-table-empty">
                      {items.length === 0
                        ? "У базі ще немає сторінок платформи."
                        : `Нічого не знайдено за «${query}».`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="wb-table-row--click">
                      <td className="wb-cell-mono">{item.slug || "/"}</td>
                      <td>{item.title || "—"}</td>
                      <td>{item.template_key || "—"}</td>
                      <td>{Number(item.is_public ?? 0) === 1 ? "Так" : "Ні"}</td>
                      <td className="wb-text-muted wb-text-xs">{item.updated_at}</td>
                      <td>
                        <button
                          className="wb-btn wb-btn-secondary"
                          onClick={() => void open(item.id)}
                        >
                          Відкрити
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {draft && (
        <div className="wb-modal-overlay" onClick={() => setDraft(null)}>
          <div className="wb-modal wb-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-header">
              <h2 className="wb-modal-title">{draft.title || draft.slug || "/"}</h2>
              <button className="wb-btn wb-btn-secondary" onClick={() => setDraft(null)}>
                Закрити
              </button>
            </div>
            <div className="wb-modal-body wb-admin-form">
              <label className="wb-admin-field">
                <span className="wb-admin-label">Адреса (slug)</span>
                <input
                  className="wb-input"
                  value={draft.slug}
                  onChange={(e) => change("slug", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Назва</span>
                <input
                  className="wb-input"
                  value={draft.title}
                  onChange={(e) => change("title", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Фото (URL)</span>
                <input
                  className="wb-input"
                  value={draft.photo_url}
                  onChange={(e) => change("photo_url", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Шаблон</span>
                <input
                  className="wb-input"
                  value={draft.template_key}
                  onChange={(e) => change("template_key", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Контент сторінки (JSON)</span>
                <textarea
                  className="wb-textarea wb-admin-json wb-admin-json--page"
                  rows={14}
                  value={draft.page_data}
                  onChange={(e) => change("page_data", e.target.value)}
                />
              </label>
              <label className="wb-admin-check">
                <input
                  type="checkbox"
                  checked={draft.is_public}
                  onChange={(e) => change("is_public", e.target.checked)}
                />
                <span>Публічна сторінка</span>
              </label>
              <label className="wb-admin-check">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => change("is_active", e.target.checked)}
                />
                <span>Сторінка активна</span>
              </label>
              {saveError && <p className="wb-admin-error">{saveError}</p>}
            </div>
            <div className="wb-modal-footer">
              <button className="wb-btn wb-btn-secondary" onClick={() => setDraft(null)}>
                Скасувати
              </button>
              <button
                className="wb-btn wb-btn-primary"
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? "Збереження…" : "Зберегти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
