/**
 * Запис у формі: текст і вид. Правка не рухає тему вгору списку.
 *
 * @module web-admin-dev/src/pages/desk/DeskEntryModal
 */

import { useState } from "react";
import { icons } from "@wwwuabot/shared";
import labels from "./desk-labels.json";
import type { DeskEntryView } from "./desk-view";

const KINDS = Object.entries(labels.kinds as Record<string, string>);

interface DeskEntryModalProps {
  entry: DeskEntryView | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (payload: { kind: string; body: string }) => void;
}

export function DeskEntryModal({ entry, busy, error, onClose, onSave }: DeskEntryModalProps) {
  const [body, setBody] = useState(entry?.body ?? "");
  const [kind, setKind] = useState(entry?.kind ?? "note");
  const clean = body.trim();

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(event) => event.stopPropagation()}>
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">{labels.editEntryTitle}</h3>
          <button className="wb-modal-close" onClick={onClose} disabled={busy}>
            {icons["close"]}
          </button>
        </div>

        <div className="wb-modal-body">
          <div className="wb-field">
            <label className="wb-label" htmlFor="desk-entry-kind">
              {labels.kindLabel}
            </label>
            <select
              id="desk-entry-kind"
              className="wb-select"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              disabled={busy}
            >
              {KINDS.map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

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

          {error && <div className="wb-modal-error">{error}</div>}
        </div>

        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary" onClick={onClose} disabled={busy}>
            {labels.close}
          </button>
          <button
            className="wb-btn wb-btn-primary"
            onClick={() => clean && onSave({ kind, body: clean })}
            disabled={busy || !clean}
          >
            {busy ? labels.saving : labels.save}
          </button>
        </div>
      </div>
    </div>
  );
}
