import { useState } from "react";
import { sendMessage } from "../../shared/api/users.api";

interface Props {
  userId: number;
  onClose: () => void;
}

export function UserMessageModal({ userId, onClose }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(userId, text.trim());
      setSent(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="usr-modal-overlay" onClick={onClose}>
      <div className="usr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usr-modal-header">
          <h3 className="usr-modal-title">Написати користувачеві #{userId}</h3>
          <button className="usr-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="usr-modal-body">
          {sent ? (
            <div className="usr-modal-success">✅ Повідомлення надіслано!</div>
          ) : (
            <>
              <textarea
                className="usr-modal-textarea"
                placeholder="Текст повідомлення…"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={sending}
              />
              {error && <div className="usr-modal-error">{error}</div>}
            </>
          )}
        </div>
        {!sent && (
          <div className="usr-modal-footer">
            <button className="btn btn--secondary" onClick={onClose} disabled={sending}>
              Скасувати
            </button>
            <button
              className="btn btn--primary"
              onClick={() => void handleSend()}
              disabled={sending || !text.trim()}
            >
              {sending ? "Надсилається…" : "Надіслати"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
