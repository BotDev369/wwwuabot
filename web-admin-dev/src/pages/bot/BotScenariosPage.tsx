/**
 * «Бот» — сценарії за ключем `lookup`: віджет або rich.
 *
 * Один екран = один ключ. HTML віджета й rich-розмітки зберігається як є; панель
 * лише перевіряє розмір і не дає зберегти порожній варіант.
 *
 * @module web-admin-dev/src/pages/bot/BotScenariosPage
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageTopbar } from "../../layout/PageTopbar";
import {
  listBotScenarios,
  readBotScenario,
  updateBotScenario,
  type BotScenarioListItem,
  type BotScenarioRecord,
  type ScenarioKind,
} from "../../shared/api/scenarios-admin.api";

type Status = "loading" | "idle" | "error";

interface Draft {
  id: number;
  lookup: string;
  kind: ScenarioKind;
  caption: string;
  widget_html: string;
  widget_data: string;
  rich_html: string;
  notify_groups: string;
  notify_template: string;
  is_active: boolean;
}

function draftOf(record: BotScenarioRecord): Draft {
  return {
    id: record.id,
    lookup: record.lookup,
    kind: record.kind,
    caption: record.caption ?? "",
    widget_html: record.widget_html ?? "",
    widget_data: record.widget_data ?? "",
    rich_html: record.rich_html ?? "",
    notify_groups: record.notify_groups ?? "",
    notify_template: record.notify_template ?? "",
    is_active: Number(record.is_active ?? 1) === 1,
  };
}

export function BotScenariosPage() {
  const [items, setItems] = useState<BotScenarioListItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await listBotScenarios());
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
    const q = query.trim();
    if (q === "") return items;
    return items.filter((item) => item.lookup.includes(q) || (item.caption ?? "").includes(q));
  }, [items, query]);

  async function open(id: number): Promise<void> {
    const record = await readBotScenario(id);
    if (record) {
      setSaveError("");
      setDraft(draftOf(record));
    }
  }

  function change<K extends keyof Draft>(key: K, value: Draft[K]): void {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save(): Promise<void> {
    if (!draft) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateBotScenario(draft.id, {
        kind: draft.kind,
        caption: draft.caption,
        widget_html: draft.widget_html,
        widget_data: draft.widget_data,
        rich_html: draft.rich_html,
        notify_groups: draft.notify_groups,
        notify_template: draft.notify_template,
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
          <h1 className="wb-topbar-title">Бот</h1>
          {items.length > 0 && <span className="wb-count">{items.length}</span>}
        </div>
        <div className="wb-topbar-right">
          <input
            type="text"
            className="wb-input wb-search"
            placeholder="Пошук за ключем або підписом…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </PageTopbar>

      <div className="wb-page-body">
        {status === "loading" ? (
          <div className="empty-state">
            <p className="empty-state-text">Завантаження сценаріїв бота…</p>
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
                  <th>Ключ</th>
                  <th>Тип</th>
                  <th>Підпис</th>
                  <th>Оновлено</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="wb-table-empty">
                      {items.length === 0
                        ? "Сценаріїв бота ще немає."
                        : `Нічого не знайдено за «${query}».`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="wb-table-row--click">
                      <td className="wb-cell-mono">{item.lookup}</td>
                      <td>{item.kind === "widget" ? "Віджет" : "Rich"}</td>
                      <td>{item.caption || "—"}</td>
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
              <h2 className="wb-modal-title">{draft.lookup}</h2>
              <button className="wb-btn wb-btn-secondary" onClick={() => setDraft(null)}>
                Закрити
              </button>
            </div>
            <div className="wb-modal-body wb-admin-form">
              <label className="wb-admin-field">
                <span className="wb-admin-label">Тип повідомлення</span>
                <select
                  className="wb-input"
                  value={draft.kind}
                  onChange={(e) => change("kind", e.target.value as ScenarioKind)}
                >
                  <option value="widget">Віджет (приватний чат)</option>
                  <option value="rich">Rich (службовий, групи)</option>
                </select>
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Підпис під віджетом</span>
                <textarea
                  className="wb-textarea"
                  rows={2}
                  value={draft.caption}
                  onChange={(e) => change("caption", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">HTML віджета</span>
                <textarea
                  className="wb-textarea wb-admin-json wb-admin-json--page"
                  rows={14}
                  value={draft.widget_html}
                  onChange={(e) => change("widget_html", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Стан віджета (chat_data, JSON)</span>
                <textarea
                  className="wb-textarea wb-admin-json"
                  rows={3}
                  value={draft.widget_data}
                  onChange={(e) => change("widget_data", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">HTML rich-повідомлення</span>
                <textarea
                  className="wb-textarea wb-admin-json wb-admin-json--page"
                  rows={10}
                  value={draft.rich_html}
                  onChange={(e) => change("rich_html", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Групи для нотифікацій (через кому)</span>
                <input
                  className="wb-input"
                  value={draft.notify_groups}
                  onChange={(e) => change("notify_groups", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Шаблон нотифікації</span>
                <textarea
                  className="wb-textarea"
                  rows={3}
                  value={draft.notify_template}
                  onChange={(e) => change("notify_template", e.target.value)}
                />
              </label>
              <label className="wb-admin-check">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => change("is_active", e.target.checked)}
                />
                <span>Сценарій активний</span>
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
