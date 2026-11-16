/**
 * Справа у формі: назва, чия черга, статус. Решта полів моделі має типові
 * значення — у столі головне, хто чекає на кого, а не теги.
 *
 * @module web-admin-dev/src/pages/desk/DeskThreadModal
 */

import { useState } from "react";
import { icons } from "@wwwuabot/shared";
import labels from "./desk-labels.json";
import type { DeskThreadView } from "./desk-view";

export interface DeskThreadPayload {
  title: string;
  turn: string;
  status: string;
}

interface DeskThreadModalProps {
  item: DeskThreadView | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (payload: DeskThreadPayload) => void;
}

const STATUSES = Object.entries(labels.statuses as Record<string, string>);
const TURNS = Object.entries(labels.turns as Record<string, string>);

export function DeskThreadModal({ item, busy, error, onClose, onSave }: DeskThreadModalProps) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [turn, setTurn] = useState(item?.turn ?? "serhii");
  const [status, setStatus] = useState(item?.status ?? "open");
  const clean = title.trim();

  function save(): void {
    if (!clean) return;
    onSave({ title: clean, turn, status });
  }

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(event) => event.stopPropagation()}>
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">{item ? labels.itemTitle : labels.newItem}</h3>
          <button className="wb-modal-close" onClick={onClose} aria-label={labels.close}>
            {icons["close"]}
          </button>
        </div>

        <div className="wb-modal-body">
          <div className="wb-field">
            <label className="wb-label" htmlFor="desk-item-title">
              {labels.titleLabel}
            </label>
            <input
              id="desk-item-title"
              className="wb-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
              }}
              disabled={busy}
            />
          </div>

          <div className="wb-field">
            <label className="wb-label" htmlFor="desk-item-turn">
              {labels.queueLabel}
            </label>
            <select
              id="desk-item-turn"
              className="wb-select"
              value={turn}
              onChange={(event) => setTurn(event.target.value)}
              disabled={busy}
            >
              {TURNS.map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="wb-field">
            <label className="wb-label" htmlFor="desk-item-status">
              {labels.statusLabel}
            </label>
            <select
              id="desk-item-status"
              className="wb-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={busy}
            >
              {STATUSES.map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="desk-error">{error}</p>}
        </div>

        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary" onClick={onClose} disabled={busy}>
            {labels.cancel}
          </button>
          <button className="wb-btn wb-btn-primary" onClick={save} disabled={busy || !clean}>
            {busy ? labels.saving : labels.save}
          </button>
        </div>
      </div>
    </div>
  );
}
