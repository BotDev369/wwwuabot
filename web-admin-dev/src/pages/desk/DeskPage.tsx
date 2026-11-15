/**
 * «Стіл» — статичний макет спільного простору Сергія й Buffy: теми й стрічка
 * з `desk-mock.json`, надіслане живе лише в стані сторінки. Мета — побачити
 * вигляд до того, як з'явиться схема й API.
 *
 * @module web-admin-dev/src/pages/desk/DeskPage
 */

import { useMemo, useState } from "react";
import mock from "./desk-mock.json";
import {
  countByGroup,
  filterThreads,
  statusTone,
  type DeskEntry,
  type DeskThread,
} from "./desk-view";

const LABELS = mock.labels;
const THREADS = mock.threads as unknown as DeskThread[];
const AUTHORS = mock.authors as Record<string, string>;
const KINDS = mock.kinds as Record<string, string>;
const STATUSES = mock.statuses as Record<string, string>;

interface Draft {
  thread: string;
  entry: DeskEntry;
}

export function DeskPage() {
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(THREADS[0].id);
  // На телефоні колонки не вміщаються: список і тема — дві панелі однієї
  // площі. На широкому екрані клас нічого не робить, обидві видно разом.
  const [roomOpen, setRoomOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftKind, setDraftKind] = useState("note");
  const [sent, setSent] = useState<Draft[]>([]);

  const threads = useMemo(
    () => filterThreads(THREADS, { group, status, query }),
    [group, status, query],
  );
  const active = THREADS.find((thread) => thread.id === activeId) ?? THREADS[0];
  const feed = [
    ...active.entries,
    ...sent.filter((item) => item.thread === active.id).map((item) => item.entry),
  ];

  function send(): void {
    if (!draftText.trim()) return;
    setSent((current) => [
      ...current,
      {
        thread: active.id,
        entry: {
          author: "serhii",
          when: LABELS.now,
          kind: draftKind,
          body: draftText.trim(),
          files: [],
        },
      },
    ]);
    setDraftText("");
  }

  return (
    <section className={`desk${roomOpen ? " desk--room" : ""}`}>
      <aside className="desk-groups">
        <div className="desk-brand">
          <b>{LABELS.title}</b>
          <span>{LABELS.subtitle}</span>
        </div>
        {mock.groups.map((item) => {
          const count = countByGroup(THREADS, item.key);
          return (
            <button
              key={item.key}
              type="button"
              className={`desk-group${item.key === group ? " desk-group--active" : ""}`}
              onClick={() => setGroup(item.key)}
            >
              <span>{item.label}</span>
              <b>{count}</b>
            </button>
          );
        })}
        <p className="desk-note">{LABELS.mock}</p>
      </aside>

      <div className="desk-list">
        <div className="desk-list-head">
          <input
            className="desk-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={LABELS.search}
            aria-label={LABELS.search}
          />
          <div className="desk-chips">
            {mock.filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`wb-chip desk-chip${filter.key === status ? " desk-chip--on" : ""}`}
                onClick={() => setStatus(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="desk-threads">
          {threads.length === 0 && <p className="desk-empty">{LABELS.empty}</p>}
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={`desk-thread${thread.id === active.id ? " desk-thread--active" : ""}`}
              onClick={() => {
                setActiveId(thread.id);
                setRoomOpen(true);
              }}
            >
              <span className="desk-thread-top">
                <span className={`wb-badge ${statusTone(thread.status)}`}>
                  {STATUSES[thread.status]}
                </span>
                <span className="desk-thread-when">{thread.updated}</span>
              </span>
              <span className="desk-thread-title">{thread.title}</span>
              <span className="desk-thread-meta">
                {thread.subgroup} · {thread.entries.length}
              </span>
              <span className="desk-thread-tags">
                {thread.tags.map((tag) => (
                  <span key={tag} className="desk-tag">
                    {tag}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="desk-room">
        <header className="desk-room-head">
          <button type="button" className="desk-room-back" onClick={() => setRoomOpen(false)}>
            {LABELS.back}
          </button>
          <span className="desk-room-path">{active.subgroup}</span>
          <h1 className="desk-room-title">{active.title}</h1>
          <span className="desk-room-tags">
            <span className={`wb-badge ${statusTone(active.status)}`}>
              {STATUSES[active.status]}
            </span>
            {active.tags.map((tag) => (
              <span key={tag} className="desk-tag">
                {tag}
              </span>
            ))}
          </span>
        </header>

        <div className="desk-feed">
          {feed.map((entry, index) => (
            <article
              key={`${entry.when}-${index}`}
              className={`desk-entry desk-entry--${entry.author}`}
            >
              <div className="desk-entry-head">
                <b className="desk-entry-author">{AUTHORS[entry.author]}</b>
                <span className="desk-entry-kind">{KINDS[entry.kind]}</span>
                <span className="desk-entry-when">{entry.when}</span>
              </div>
              <p className="desk-entry-body">{entry.body}</p>
              {entry.files.length > 0 && (
                <div className="desk-files">
                  {entry.files.map((file) => (
                    <span key={file.name} className="desk-file">
                      <span className="desk-file-name">{file.name}</span>
                      <span className="desk-file-size">{file.size}</span>
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="desk-composer">
          <textarea
            className="desk-composer-input"
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send();
            }}
            placeholder={LABELS.composerPlaceholder}
            aria-label={LABELS.composerPlaceholder}
          />
          <div className="desk-composer-row">
            <div className="desk-composer-tools">
              <select
                className="desk-composer-kind"
                value={draftKind}
                onChange={(event) => setDraftKind(event.target.value)}
                aria-label={LABELS.kindLabel}
              >
                {Object.entries(KINDS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <button type="button" className="wb-btn wb-btn-ghost wb-btn-sm">
                {LABELS.attach}
              </button>
              <span className="desk-hint">{LABELS.composerHint}</span>
            </div>
            <button type="button" className="wb-btn wb-btn-primary" onClick={send}>
              {LABELS.send}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
