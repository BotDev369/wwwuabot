/**
 * «Платформа» — сторінки вебу з таблиці `platform_pages`: список і **перегляд**.
 *
 * **Правки тут немає.** Сторінку збирає й публікує розробник (код і міграції),
 * тож картка показує поля сторінки як є — без інпутів, чекбоксів і кнопки
 * «Зберегти». Сирий `page_data` у textarea був другим способом збудувати екран
 * руками; тепер екран будує рівно один шлях — `PageCanvas` із тих даних, які
 * поклала міграція.
 *
 * @module web-admin-dev/src/pages/platform/PlatformPagesPage
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageTopbar } from "../../layout/PageTopbar";
import {
  listPlatformPages,
  readPlatformPage,
  type PlatformPageListItem,
  type PlatformPageRecord,
} from "../../shared/api/scenarios-admin.api";

type Status = "loading" | "idle" | "error";

export function PlatformPagesPage() {
  const [items, setItems] = useState<PlatformPageListItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [record, setRecord] = useState<PlatformPageRecord | null>(null);

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
    const found = await readPlatformPage(id);
    if (found) setRecord(found);
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

      {record && (
        <div className="wb-modal-overlay" onClick={() => setRecord(null)}>
          <div className="wb-modal wb-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-header">
              <h2 className="wb-modal-title">{record.title || record.slug || "/"}</h2>
              <button className="wb-btn wb-btn-secondary" onClick={() => setRecord(null)}>
                Закрити
              </button>
            </div>
            <div className="wb-modal-body wb-admin-form">
              <div className="wb-admin-field">
                <span className="wb-admin-label">Адреса (slug)</span>
                <p className="wb-text-base">{record.slug || "/"}</p>
              </div>
              <div className="wb-admin-field">
                <span className="wb-admin-label">Назва</span>
                <p className="wb-text-base">{record.title || "—"}</p>
              </div>
              <div className="wb-admin-field">
                <span className="wb-admin-label">Фото (URL)</span>
                <p className="wb-text-base">{record.photo_url || "—"}</p>
              </div>
              <div className="wb-admin-field">
                <span className="wb-admin-label">Шаблон</span>
                <p className="wb-text-base">{record.template_key || "—"}</p>
              </div>
              <div className="wb-admin-field">
                <span className="wb-admin-label">Публічна</span>
                <p className="wb-text-base">{Number(record.is_public ?? 0) === 1 ? "Так" : "Ні"}</p>
              </div>
              <div className="wb-admin-field">
                <span className="wb-admin-label">Активна</span>
                <p className="wb-text-base">{Number(record.is_active ?? 1) === 1 ? "Так" : "Ні"}</p>
              </div>
              <div className="wb-admin-field">
                <span className="wb-admin-label">Контент сторінки (JSON)</span>
                <pre className="wb-admin-json wb-admin-json--page">{record.page_data || "{}"}</pre>
              </div>
              <p className="wb-text-sm wb-text-muted">
                Сторінку збирає розробник — кодом і міграціями. Тут лише перегляд.
              </p>
            </div>
            <div className="wb-modal-footer">
              <button className="wb-btn wb-btn-secondary" onClick={() => setRecord(null)}>
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
