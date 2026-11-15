/**
 * Картка теми в списку; ціла картка — одна кнопка.
 *
 * @module web-admin-dev/src/pages/desk/DeskThreadCard
 */

import labels from "./desk-labels.json";
import { statusTone, type DeskThreadView } from "./desk-view";

const STATUSES = labels.statuses as Record<string, string>;
const GROUP_LABELS = new Map(labels.groups.map((item) => [item.key, item.label]));

interface DeskThreadCardProps {
  thread: DeskThreadView;
  active: boolean;
  onOpen: () => void;
}

export function DeskThreadCard({ thread, active, onOpen }: DeskThreadCardProps) {
  return (
    <button
      type="button"
      className={`desk-thread${active ? " desk-thread--active" : ""}`}
      onClick={onOpen}
    >
      <span className="desk-thread-top">
        <span className={`wb-badge ${statusTone(thread.status)}`}>
          {STATUSES[thread.status] ?? thread.status}
        </span>
        {thread.archived && <span className="wb-badge wb-badge-neutral">{labels.archive}</span>}
        {thread.unread > 0 && <span className="wb-badge wb-badge-accent">{labels.unread}</span>}
        <span className="desk-thread-when">{thread.updated}</span>
      </span>
      <span className="desk-thread-title">{thread.title}</span>
      <span className="desk-thread-meta">
        {thread.subgroup || GROUP_LABELS.get(thread.group) || thread.group} · {thread.entries}
      </span>
      <span className="desk-thread-tags">
        {thread.tags.map((tag) => (
          <span key={tag} className="wb-chip desk-tag">
            {tag}
          </span>
        ))}
      </span>
    </button>
  );
}
