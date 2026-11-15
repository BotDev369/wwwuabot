/**
 * «Стіл» — спільний простір Сергія й Buffy на живих даних: список, тема,
 * композер і файли. Фільтри питають сервер і не ховають причину порожнечі:
 * коли нічого не знайдено, видно, що саме стоїть і як його скинути.
 *
 * @module web-admin-dev/src/pages/desk/DeskPage
 */

import { useCallback, useEffect, useState } from "react";
import {
  addDeskEntry,
  deleteDeskEntry,
  deleteDeskFile,
  fetchDeskThread,
  fetchDeskThreads,
  markDeskRead,
  saveDeskThread,
  uploadDeskFile,
} from "./desk.api";
import labels from "./desk-labels.json";
import { DeskRoom } from "./DeskRoom";
import {
  countByGroup,
  lastEntryId,
  statusTone,
  toRoomView,
  toThreadView,
  type DeskRoomView,
  type DeskThreadView,
} from "./desk-view";

const STATUSES = labels.statuses as Record<string, string>;
const UNITS = labels.units;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : labels.failed;
}

export function DeskPage() {
  const [threads, setThreads] = useState<DeskThreadView[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [room, setRoom] = useState<DeskRoomView | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newGroup, setNewGroup] = useState("plan");

  const refresh = useCallback(() => setReload((current) => current + 1), []);
  const hasFilters = group !== "all" || status !== "all" || query.trim() !== "";

  function resetFilters(): void {
    setGroup("all");
    setStatus("all");
    setQuery("");
  }

  // Список: пошук із паузи, щоб набір не бив по серверу на кожну літеру.
  // Старі теми лишаються на екрані, доки їдуть нові: інакше на повільній
  // мережі «порожньо» показувалось би раніше за відповідь і читалось як
  // помилка фільтра.
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(
      () => {
        setLoading(true);
        fetchDeskThreads({ group, status, q: query.trim() })
          .then((data) => {
            if (!alive) return;
            const list = data.threads.map(toThreadView);
            setThreads(list);
            setCounts(data.counts ?? {});
            setActiveId((current) => current ?? list[0]?.id ?? null);
            setError("");
          })
          .catch((cause: unknown) => alive && setError(messageOf(cause)))
          .finally(() => alive && setLoading(false));
      },
      query.trim() ? 250 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [group, status, query, reload]);

  // Тема: свіжа стрічка, файли й позначка «вичитано до останнього запису».
  useEffect(() => {
    if (activeId === null) return;
    let alive = true;
    fetchDeskThread(activeId)
      .then((data) => {
        if (!alive) return;
        setRoom(toRoomView(data, UNITS));
        const seen = lastEntryId(data.entries);
        if (seen > 0) void markDeskRead(data.thread.id, seen).catch(() => undefined);
        setThreads((current) =>
          current.map((thread) =>
            thread.id === data.thread.id ? { ...thread, unread: 0 } : thread,
          ),
        );
        setError("");
      })
      .catch((cause: unknown) => alive && setError(messageOf(cause)));
    return () => {
      alive = false;
    };
  }, [activeId, reload]);

  async function send(text: string, kind: string, files: File[]): Promise<void> {
    const threadId = room?.thread.id;
    if (!threadId) return;
    const body = text.trim() || files.map((file) => file.name).join(", ");
    if (!body) return;

    setBusy(true);
    setError("");
    try {
      const saved = await addDeskEntry({
        thread_id: threadId,
        kind: text.trim() ? kind : "file",
        body,
      });
      // Файли — по одному: так збій на одному не з'їдає решту, а ліміту на
      // кількість немає ні тут, ні на сервері.
      for (const file of files) await uploadDeskFile(threadId, lastEntryId(saved.entries), file);
      setRoom(toRoomView(saved, UNITS));
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function patchThread(patch: Record<string, unknown>): Promise<void> {
    if (!room) return;
    const thread = room.thread;
    setBusy(true);
    setError("");
    try {
      const saved = await saveDeskThread({
        id: thread.id,
        title: thread.title,
        group: thread.group,
        subgroup: thread.subgroup,
        status: thread.status,
        turn: thread.turn,
        tags: thread.tags,
        due_at: thread.due_at,
        priority: thread.priority,
        ...patch,
      });
      setRoom(toRoomView(saved, UNITS));
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function createThread(): Promise<void> {
    const title = newTitle.trim();
    if (!title) return;
    setBusy(true);
    setError("");
    try {
      const saved = await saveDeskThread({ title, group: newGroup });
      setNewTitle("");
      setNewOpen(false);
      resetFilters();
      setActiveId(saved.thread.id);
      setRoomOpen(true);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function dropEntry(id: number): Promise<void> {
    try {
      await deleteDeskEntry(id);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    }
  }

  async function dropFile(id: number): Promise<void> {
    try {
      await deleteDeskFile(id);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    }
  }

  return (
    <section className={`desk${roomOpen ? " desk--room" : ""}`}>
      <aside className="desk-groups">
        <div className="desk-brand">
          <b>{labels.title}</b>
          <span>{labels.subtitle}</span>
        </div>
        {labels.groups.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`desk-group${item.key === group ? " desk-group--active" : ""}`}
            aria-pressed={item.key === group}
            onClick={() => setGroup(item.key)}
          >
            <span>{item.label}</span>
            <b>{item.key === "all" ? countByGroup(counts) : (counts[item.key] ?? 0)}</b>
          </button>
        ))}
        {error && <p className="desk-note desk-note--error">{error}</p>}
      </aside>

      <div className="desk-list">
        <div className="desk-list-head">
          <div className="desk-search-row">
            <input
              className="desk-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.search}
              aria-label={labels.search}
            />
            <button
              type="button"
              className="wb-btn wb-btn-ghost wb-btn-sm desk-newbtn"
              aria-pressed={newOpen}
              onClick={() => setNewOpen((current) => !current)}
            >
              {labels.newThread}
            </button>
          </div>
          <div className="desk-chips">
            {labels.statusFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`wb-chip desk-chip${filter.key === status ? " desk-chip--on" : ""}`}
                aria-pressed={filter.key === status}
                onClick={() => setStatus(filter.key)}
              >
                {filter.label}
              </button>
            ))}
            {hasFilters && (
              <button
                type="button"
                className="wb-chip desk-chip desk-chip--reset"
                onClick={resetFilters}
              >
                {labels.resetFilters}
              </button>
            )}
          </div>
          {newOpen && (
            <div className="desk-newform">
              <input
                className="desk-search"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createThread();
                }}
                placeholder={labels.newTitle}
                aria-label={labels.newTitle}
              />
              <select
                value={newGroup}
                onChange={(event) => setNewGroup(event.target.value)}
                aria-label={labels.groupLabel}
              >
                {labels.groups
                  .filter((item) => item.key !== "all")
                  .map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="wb-btn wb-btn-primary wb-btn-sm"
                onClick={() => void createThread()}
                disabled={busy || !newTitle.trim()}
              >
                {labels.create}
              </button>
            </div>
          )}
        </div>

        <div className="desk-threads" aria-busy={loading}>
          {loading && threads.length === 0 && <p className="desk-empty">{labels.loading}</p>}
          {!loading && threads.length === 0 && <p className="desk-empty">{labels.empty}</p>}
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={`desk-thread${thread.id === activeId ? " desk-thread--active" : ""}`}
              onClick={() => {
                setActiveId(thread.id);
                setRoomOpen(true);
              }}
            >
              <span className="desk-thread-top">
                <span className={`wb-badge ${statusTone(thread.status)}`}>
                  {STATUSES[thread.status] ?? thread.status}
                </span>
                {thread.unread > 0 && (
                  <span className="wb-badge wb-badge-accent">{labels.unread}</span>
                )}
                <span className="desk-thread-when">{thread.updated}</span>
              </span>
              <span className="desk-thread-title">{thread.title}</span>
              <span className="desk-thread-meta">
                {thread.subgroup || labels.allThreads} · {thread.entries}
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

      {room && activeId !== null ? (
        <DeskRoom
          key={room.thread.id}
          room={room}
          busy={busy}
          onBack={() => setRoomOpen(false)}
          onSend={(text, kind, files) => void send(text, kind, files)}
          onPatchThread={(patch) => void patchThread(patch)}
          onDeleteEntry={(id) => void dropEntry(id)}
          onDeleteFile={(id) => void dropFile(id)}
        />
      ) : (
        <div className="desk-room desk-room--empty">
          <p className="desk-empty">{labels.empty}</p>
        </div>
      )}
    </section>
  );
}
