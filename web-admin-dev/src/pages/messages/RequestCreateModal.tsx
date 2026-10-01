/**
 * Новий запис у пошті про звернення.
 *
 * **Навіщо він адміністратору.** Людина може написати й поза платформою — у
 * Telegram, голосом, у нотатках. Таке звернення теж має де лежати поряд із
 * написаними з Mini App, але без `user_id` воно нікому не належить, тож автора
 * треба вибрати зі списку людей: «вибрав когось у списку» і «вписав номер у
 * полі» — різні речі, і тільки перше не народжує звернення від неіснуючої
 * людини.
 *
 * @module web-admin-dev/src/pages/messages/RequestCreateModal
 */

import { useEffect, useMemo, useState } from "react";
import type { UserRow } from "../../shared/api/users.api";
import { listUsers } from "../../shared/api/users.api";
import {
  ACCESS_REQUEST_MAX,
  accessRequestAuthor,
  sanitizeAccessRequestText,
} from "@wwwuabot/shared/access-requests";
import { icons } from "@wwwuabot/shared";
import { useAccessRequests } from "../../features/access-requests/store";

interface RequestCreateModalProps {
  onClose: () => void;
}

/** Скільки людей показуємо без пошуку: список, а не стіна імен. */
const SUGGEST = 8;

/** Підпис людини для пошуку й вибору — те саме, що показує список звернень. */
function authorOf(row: UserRow): string {
  return accessRequestAuthor({
    first_name: row.first_name,
    last_name: row.last_name,
    username: row.username,
    platform_username: typeof row.platform_username === "string" ? row.platform_username : null,
  });
}

export function RequestCreateModal({ onClose }: RequestCreateModalProps) {
  const { create } = useAccessRequests();
  const [rows, setRows] = useState<readonly UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [authorId, setAuthorId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Список людей читається один раз, при відкритті: пошук уже клієнтський.
  useEffect(() => {
    void listUsers()
      .then(setRows)
      .catch((e: unknown) => setError((e as Error).message));
  }, []);

  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter(
          (row) => authorOf(row).toLowerCase().includes(q) || String(row.user_id).includes(q),
        )
      : rows;
    return list.slice(0, SUGGEST);
  }, [rows, query]);

  const clean = sanitizeAccessRequestText(text);

  async function handleCreate(): Promise<void> {
    if (authorId === null || !clean) return;
    setBusy(true);
    setError(null);
    try {
      await create(authorId, clean);
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">Нове повідомлення</h3>
          <button className="wb-modal-close" onClick={onClose} disabled={busy}>
            {icons["close"]}
          </button>
        </div>

        <div className="wb-modal-body">
          <div className="wb-field">
            <label className="wb-label" htmlFor="access-request-author">
              Автор
            </label>
            <input
              id="access-request-author"
              className="wb-input"
              placeholder="Ім'я, підпис або Telegram ID…"
              value={query}
              // Змінили пошук — обраної людини більше не видно, тож вибір скидається:
              // інакше «Зберегти» записало б звернення тому, кого вже не показано.
              onChange={(e) => {
                setQuery(e.target.value);
                setAuthorId(null);
              }}
              disabled={busy}
            />
          </div>

          <div className="wb-modal-menu">
            {found.length === 0 ? (
              <div className="wb-empty">
                <p className="wb-empty-text">Нікого не знайдено.</p>
              </div>
            ) : (
              found.map((row) => (
                <button
                  key={row.user_id}
                  className="wb-modal-menu-item"
                  disabled={busy}
                  onClick={() => {
                    setAuthorId(row.user_id);
                    setQuery(authorOf(row));
                  }}
                >
                  {authorOf(row)} · {row.user_id}
                  {authorId === row.user_id ? " · обрано" : ""}
                </button>
              ))
            )}
          </div>

          <div className="wb-field">
            <label className="wb-label" htmlFor="access-request-new-text">
              Повідомлення
            </label>
            <textarea
              id="access-request-new-text"
              className="wb-textarea"
              rows={6}
              maxLength={ACCESS_REQUEST_MAX}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
            <span className="wb-label">
              {text.length} із {ACCESS_REQUEST_MAX}
            </span>
          </div>

          {error && <div className="wb-modal-error">{error}</div>}
        </div>

        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary" onClick={onClose} disabled={busy}>
            Скасувати
          </button>
          <button
            className="wb-btn wb-btn-primary"
            onClick={() => void handleCreate()}
            disabled={busy || authorId === null || !clean}
          >
            {busy ? "Зберігається…" : "Зберегти"}
          </button>
        </div>
      </div>
    </div>
  );
}
