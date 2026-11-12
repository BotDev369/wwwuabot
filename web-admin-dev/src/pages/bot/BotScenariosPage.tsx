/**
 * «Бот» — екрани чату з таблиці `bot_scenarios`: список і картка правки.
 * Контент сторінки живе в `platform_pages` і має власний екран.
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
} from "../../shared/api/scenarios-admin.api";

type Status = "loading" | "idle" | "error";

/** Те, що картка тримає в полях; `buttons` і `rich_data` — JSON-текстом. */
interface BotDraft {
  id: number;
  slug: string;
  bot_command: string;
  photo_url: string;
  caption_top: string;
  caption_mid: string;
  caption_bot: string;
  keyboard_type: string;
  buttons: string;
  awaits_input: string;
  rich_message: boolean;
  rich_data: string;
  is_active: boolean;
}

function draftOf(record: BotScenarioRecord): BotDraft {
  return {
    id: record.id,
    slug: record.slug,
    bot_command: record.bot_command ?? "",
    photo_url: record.photo_url ?? "",
    caption_top: record.caption_top ?? "",
    caption_mid: record.caption_mid ?? "",
    caption_bot: record.caption_bot ?? "",
    keyboard_type: record.keyboard_type,
    buttons: record.buttons || "[]",
    awaits_input: record.awaits_input ?? "",
    rich_message: record.rich_message === "true" || record.rich_message === "1",
    rich_data: record.rich_data ?? "",
    is_active: Number(record.is_active ?? 1) === 1,
  };
}

export function BotScenariosPage() {
  const [items, setItems] = useState<BotScenarioListItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<BotDraft | null>(null);
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
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.slug.toLowerCase().includes(q) ||
        (item.bot_command ?? "").toLowerCase().includes(q) ||
        (item.title ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  async function open(id: number): Promise<void> {
    const record = await readBotScenario(id);
    if (record) {
      setSaveError("");
      setDraft(draftOf(record));
    }
  }

  function change<K extends keyof BotDraft>(key: K, value: BotDraft[K]): void {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save(): Promise<void> {
    if (!draft) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateBotScenario(draft.id, {
        bot_command: draft.bot_command,
        photo_url: draft.photo_url,
        caption_top: draft.caption_top,
        caption_mid: draft.caption_mid,
        caption_bot: draft.caption_bot,
        keyboard_type: draft.keyboard_type,
        buttons: draft.buttons,
        awaits_input: draft.awaits_input,
        rich_message: draft.rich_message ? "true" : "false",
        rich_data: draft.rich_data,
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
            placeholder="Пошук за командою, адресою або назвою…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </PageTopbar>

      <div className="wb-page-body">
        {status === "loading" ? (
          <div className="empty-state">
            <p className="empty-state-text">Завантаження екранів бота…</p>
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
                  <th>Команда</th>
                  <th>Адреса</th>
                  <th>Назва</th>
                  <th>Оновлено</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="wb-table-empty">
                      {items.length === 0
                        ? "У базі ще немає екранів бота."
                        : `Нічого не знайдено за «${query}».`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="wb-table-row--click">
                      <td className="wb-cell-mono">{item.bot_command || "—"}</td>
                      <td className="wb-cell-mono">{item.slug || "—"}</td>
                      <td>{item.title || "—"}</td>
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
              <h2 className="wb-modal-title">{draft.bot_command || draft.slug || "Екран"}</h2>
              <button className="wb-btn wb-btn-secondary" onClick={() => setDraft(null)}>
                Закрити
              </button>
            </div>
            <div className="wb-modal-body wb-admin-form">
              <label className="wb-admin-field">
                <span className="wb-admin-label">Команда (напр. /start)</span>
                <input
                  className="wb-input"
                  value={draft.bot_command}
                  onChange={(e) => change("bot_command", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Підпис зверху</span>
                <textarea
                  className="wb-textarea"
                  rows={3}
                  value={draft.caption_top}
                  onChange={(e) => change("caption_top", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Підпис посередині</span>
                <textarea
                  className="wb-textarea"
                  rows={2}
                  value={draft.caption_mid}
                  onChange={(e) => change("caption_mid", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Підпис знизу</span>
                <textarea
                  className="wb-textarea"
                  rows={2}
                  value={draft.caption_bot}
                  onChange={(e) => change("caption_bot", e.target.value)}
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
                <span className="wb-admin-label">Тип клавіатури</span>
                <input
                  className="wb-input"
                  value={draft.keyboard_type}
                  onChange={(e) => change("keyboard_type", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Кнопки (JSON-масив)</span>
                <textarea
                  className="wb-textarea wb-admin-json"
                  rows={6}
                  value={draft.buttons}
                  onChange={(e) => change("buttons", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Очікує вводу</span>
                <input
                  className="wb-input"
                  value={draft.awaits_input}
                  onChange={(e) => change("awaits_input", e.target.value)}
                />
              </label>
              <label className="wb-admin-field">
                <span className="wb-admin-label">Rich-розмітка (JSON-масив)</span>
                <textarea
                  className="wb-textarea wb-admin-json"
                  rows={6}
                  value={draft.rich_data}
                  onChange={(e) => change("rich_data", e.target.value)}
                />
              </label>
              <label className="wb-admin-check">
                <input
                  type="checkbox"
                  checked={draft.rich_message}
                  onChange={(e) => change("rich_message", e.target.checked)}
                />
                <span>Rich-повідомлення</span>
              </label>
              <label className="wb-admin-check">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => change("is_active", e.target.checked)}
                />
                <span>Екран активний</span>
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
