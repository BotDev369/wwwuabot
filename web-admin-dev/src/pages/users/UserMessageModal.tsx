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
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">Написати користувачеві #{userId}</h3>
          <button className="wb-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="wb-modal-body">
          {sent ? (
            <div className="wb-badge wb-badge-green">✅ Повідомлення надіслано!</div>
          ) : (
            <>
              <textarea
                className="wb-textarea"
                placeholder="Текст повідомлення…"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={sending}
              />
              {error && <div className="wb-modal-error">{error}</div>}
            </>
          )}
        </div>
        {!sent && (
          <div className="wb-modal-footer">
            <button className="wb-btn wb-btn-secondary" onClick={onClose} disabled={sending}>
              Скасувати
            </button>
            <button
              className="wb-btn wb-btn-primary"
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
