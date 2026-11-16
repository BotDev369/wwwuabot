/**
 * Запис у формі: тільки текст. Правка не рухає справу вгору списку.
 *
 * @module web-admin-dev/src/pages/desk/DeskEntryModal
 */

import { useState } from "react";
import { icons } from "@wwwuabot/shared";
import labels from "./desk-labels.json";
import type { DeskEntryView } from "./desk-view";

interface DeskEntryModalProps {
  entry: DeskEntryView;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (body: string) => void;
}

export function DeskEntryModal({ entry, busy, error, onClose, onSave }: DeskEntryModalProps) {
  const [body, setBody] = useState(entry.body);
  const clean = body.trim();

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(event) => event.stopPropagation()}>
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">{labels.editEntry}</h3>
          <button className="wb-modal-close" onClick={onClose} aria-label={labels.close}>
            {icons["close"]}
          </button>
        </div>

        <div className="wb-modal-body">
          <div className="wb-field">
            <label className="wb-label" htmlFor="desk-entry-body">
              {labels.bodyLabel}
            </label>
            <textarea
              id="desk-entry-body"
              className="wb-textarea"
              rows={8}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={busy}
            />
          </div>
          {error && <p className="desk-error">{error}</p>}
        </div>

        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary" onClick={onClose} disabled={busy}>
            {labels.cancel}
          </button>
          <button
            className="wb-btn wb-btn-primary"
            onClick={() => clean && onSave(clean)}
            disabled={busy || !clean}
          >
            {busy ? labels.saving : labels.save}
          </button>
        </div>
      </div>
    </div>
  );
}
