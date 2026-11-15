/**
 * Тема у формі: створити або змінити — та сама модалка, що й у зверненнях.
 *
 * @module web-admin-dev/src/pages/desk/DeskThreadModal
 */

import { useState } from "react";
import { icons } from "@wwwuabot/shared";
import labels from "./desk-labels.json";
import type { DeskThreadView } from "./desk-view";

export interface DeskThreadPayload {
  title: string;
  group: string;
  subgroup: string;
  status: string;
  turn: string;
  tags: string[];
}

interface DeskThreadModalProps {
  thread: DeskThreadView | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (payload: DeskThreadPayload) => void;
}

const GROUPS = labels.groups.filter((item) => item.key !== "all");
const STATUSES = Object.entries(labels.statuses as Record<string, string>);
const TURNS = Object.entries(labels.turns as Record<string, string>);

export function DeskThreadModal({ thread, busy, error, onClose, onSave }: DeskThreadModalProps) {
  const [title, setTitle] = useState(thread?.title ?? "");
  const [group, setGroup] = useState(thread?.group ?? "plan");
  const [subgroup, setSubgroup] = useState(thread?.subgroup ?? "");
  const [status, setStatus] = useState(thread?.status ?? "open");
  const [turn, setTurn] = useState(thread?.turn ?? "none");
  const [tags, setTags] = useState((thread?.tags ?? []).join(", "));

  const clean = title.trim();

  function save(): void {
    if (!clean) return;
    onSave({
      title: clean,
      group,
      subgroup: subgroup.trim(),
      status,
      turn,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  }

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(event) => event.stopPropagation()}>
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">{thread ? labels.editThreadTitle : labels.newThread}</h3>
          <button className="wb-modal-close" onClick={onClose} disabled={busy}>
            {icons["close"]}
          </button>
        </div>

        <div className="wb-modal-body">
          <div className="wb-field">
            <label className="wb-label" htmlFor="desk-thread-title">
              {labels.titleLabel}
            </label>
            <input
              id="desk-thread-title"
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
            <label className="wb-label" htmlFor="desk-thread-group">
              {labels.groupLabel}
            </label>
            <select
              id="desk-thread-group"
              className="wb-select"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              disabled={busy}
            >
              {GROUPS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="wb-field">
            <label className="wb-label" htmlFor="desk-thread-subgroup">
              {labels.subgroupLabel}
            </label>
            <input
              id="desk-thread-subgroup"
              className="wb-input"
              value={subgroup}
              onChange={(event) => setSubgroup(event.target.value)}
              disabled={busy}
            />
          </div>

          <div className="wb-field">
            <label className="wb-label" htmlFor="desk-thread-status">
              {labels.statusLabel}
            </label>
            <select
              id="desk-thread-status"
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

          <div className="wb-field">
            <label className="wb-label" htmlFor="desk-thread-turn">
              {labels.turnLabel}
            </label>
            <select
              id="desk-thread-turn"
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
            <label className="wb-label" htmlFor="desk-thread-tags">
              {labels.tagsLabel}
            </label>
            <input
              id="desk-thread-tags"
              className="wb-input"
              value={tags}
              placeholder={labels.tagsHint}
              onChange={(event) => setTags(event.target.value)}
              disabled={busy}
            />
          </div>

          {error && <div className="wb-modal-error">{error}</div>}
        </div>

        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary" onClick={onClose} disabled={busy}>
            {labels.close}
          </button>
          <button className="wb-btn wb-btn-primary" onClick={save} disabled={busy || !clean}>
            {busy ? labels.saving : labels.save}
          </button>
        </div>
      </div>
    </div>
  );
}
