/**
 * Одне звернення: що воно, від кого, і що з ним можна зробити.
 *
 * **Правка — це текст, а не автор.** Людина сказала те, що сказала; переписувати
 * її слова ми не даємо навіть адміністратору, тож у модалці редагується лише
 * текст (напр. виправити помилку або витерти посилання на закриту тему).
 *
 * **Видалення питається.** Нативний `confirm` у Telegram Mini App не працює, а
 * рядок з текстом людини не відновлюється, тому підтвердження — спільний
 * `useDialog()` (`AGENTS.md` §4).
 *
 * @module web-admin-dev/src/pages/messages/RequestModal
 */

import { useState } from "react";
import type { AccessRequestItem } from "@wwwuabot/shared/access-requests";
import {
  ACCESS_REQUEST_MAX,
  accessRequestAuthor,
  sanitizeAccessRequestText,
} from "@wwwuabot/shared/access-requests";
import { icons } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";
import { useAccessRequests } from "../../features/access-requests/store";
import { formatWhen, whenTitle } from "./formatWhen";

interface RequestModalProps {
  item: AccessRequestItem;
  onClose: () => void;
}

export function RequestModal({ item, onClose }: RequestModalProps) {
  const dialog = useDialog();
  const { update, remove } = useAccessRequests();
  const [text, setText] = useState(item.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = sanitizeAccessRequestText(text) !== item.text;
  const clean = sanitizeAccessRequestText(text);

  async function handleSave(): Promise<void> {
    if (!clean) return;
    setBusy(true);
    setError(null);
    try {
      await update(item.id, clean);
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function handleDelete(): Promise<void> {
    const ok = await dialog.confirm("Видалити повідомлення? Воно зникне безповоротно.", {
      tone: "danger",
      confirmText: "Видалити",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await remove(item.id);
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
          <h3 className="wb-modal-title">{accessRequestAuthor(item)}</h3>
          <button className="wb-modal-close" onClick={onClose} disabled={busy}>
            {icons["close"]}
          </button>
        </div>

        <div className="wb-modal-body">
          <div className="wb-field">
            <span className="wb-label">Автор</span>
            <div>
              Telegram ID: {item.user_id}
              {item.username ? ` · @${item.username}` : ""}
              {item.platform_username ? ` · #${item.platform_username}` : ""}
            </div>
          </div>
          <div className="wb-field">
            <span className="wb-label" title={whenTitle(item.created_at)}>
              Написано {formatWhen(item.created_at)}
            </span>
          </div>

          <div className="wb-field">
            <label className="wb-label" htmlFor="access-request-text">
              Повідомлення
            </label>
            <textarea
              id="access-request-text"
              className="wb-textarea"
              rows={8}
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
          <button
            className="wb-btn wb-btn-danger"
            onClick={() => void handleDelete()}
            disabled={busy}
          >
            Видалити
          </button>
          <button className="wb-btn wb-btn-secondary" onClick={onClose} disabled={busy}>
            Закрити
          </button>
          <button
            className="wb-btn wb-btn-primary"
            onClick={() => void handleSave()}
            disabled={busy || !dirty || !clean}
          >
            {busy ? "Зберігається…" : "Зберегти"}
          </button>
        </div>
      </div>
    </div>
  );
}
