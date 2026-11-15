/**
 * «Стіл»: живий список, тема, композер. Форми й підтвердження — спільні
 * кирпичики (`wb-modal*`, `useDialog`), архів — окремий зріз списку.
 *
 * @module web-admin-dev/src/pages/desk/DeskPage
 */

import { useCallback, useEffect, useState } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import {
  addDeskEntry,
  deleteDeskEntry,
  deleteDeskFile,
  deleteDeskThread,
  fetchDeskThread,
  fetchDeskThreads,
  markDeskRead,
  saveDeskThread,
  uploadDeskFile,
} from "./desk.api";
import labels from "./desk-labels.json";
import { DeskEntryModal } from "./DeskEntryModal";
import { DeskGroupRail } from "./DeskGroupRail";
import { DeskRoom } from "./DeskRoom";
import { DeskThreadCard } from "./DeskThreadCard";
import { DeskTopbar } from "./DeskTopbar";
import { DeskThreadModal, type DeskThreadPayload } from "./DeskThreadModal";
import {
  countByGroup,
  lastEntryId,
  toRoomView,
  toThreadView,
  type DeskEntryView,
  type DeskRoomView,
  type DeskThreadView,
} from "./desk-view";

const UNITS = labels.units;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : labels.failed;
}

export function DeskPage() {
  const dialog = useDialog();
  const [threads, setThreads] = useState<DeskThreadView[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [room, setRoom] = useState<DeskRoomView | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [threadModal, setThreadModal] = useState<"create" | "edit" | null>(null);
  const [editingEntry, setEditingEntry] = useState<DeskEntryView | null>(null);

  const refresh = useCallback(() => setReload((current) => current + 1), []);
  const hasFilters = group !== "all" || status !== "all" || query.trim() !== "" || archivedOnly;

  function resetFilters(): void {
    setGroup("all");
    setStatus("all");
    setQuery("");
    setArchivedOnly(false);
  }

  // Пошук із паузи; старі теми лишаються, доки їдуть нові — інакше на повільній
  // мережі «порожньо» показувалось би раніше за відповідь.
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(
      () => {
        setLoading(true);
        fetchDeskThreads({
          group,
          status,
          q: query.trim(),
          archived: archivedOnly ? "only" : "hide",
        })
          .then((data) => {
            if (!alive) return;
            const list = data.threads.map(toThreadView);
            setThreads(list);
            setCounts(data.counts ?? {});
            setActiveId((current) =>
              current !== null && list.some((thread) => thread.id === current)
                ? current
                : (list[0]?.id ?? null),
            );
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
  }, [group, status, query, archivedOnly, reload]);

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
      // Файли — по одному: збій на одному не з'їдає решту, а ліміту на
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

  async function saveThreadForm(payload: DeskThreadPayload): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = { ...payload };
      if (threadModal === "edit" && room) body.id = room.thread.id;
      const saved = await saveDeskThread(body);
      setThreadModal(null);
      setRoom(toRoomView(saved, UNITS));
      setActiveId(saved.thread.id);
      setRoomOpen(true);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveEntryForm(payload: { kind: string; body: string }): Promise<void> {
    const entry = editingEntry;
    const threadId = room?.thread.id;
    if (!entry || !threadId) return;
    setBusy(true);
    setError("");
    try {
      const saved = await addDeskEntry({ id: entry.id, thread_id: threadId, ...payload });
      setEditingEntry(null);
      setRoom(toRoomView(saved, UNITS));
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeThread(): Promise<void> {
    if (!room) return;
    if (
      !(await dialog.confirm(labels.deleteThreadQuestion, {
        tone: "danger",
        confirmText: labels.confirmDelete,
      }))
    )
      return;
    try {
      await deleteDeskThread(room.thread.id);
      setRoom(null);
      setActiveId(null);
      setRoomOpen(false);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    }
  }

  async function removeEntry(id: number): Promise<void> {
    if (
      !(await dialog.confirm(labels.deleteEntryQuestion, {
        tone: "danger",
        confirmText: labels.confirmDelete,
      }))
    )
      return;
    try {
      await deleteDeskEntry(id);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    }
  }

  async function removeFile(id: number): Promise<void> {
    if (
      !(await dialog.confirm(labels.deleteFileQuestion, {
        tone: "danger",
        confirmText: labels.confirmDelete,
      }))
    )
      return;
    try {
      await deleteDeskFile(id);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    }
  }

  return (
    <>
      <DeskTopbar
        total={countByGroup(counts)}
        query={query}
        onQuery={setQuery}
        onCreate={() => setThreadModal("create")}
      />

      <div className="wb-page-body">
        <section className={`desk${roomOpen ? " desk--room" : ""}`}>
          <DeskGroupRail
            counts={counts}
            group={group}
            archivedOnly={archivedOnly}
            error={error}
            onPickGroup={(key) => {
              setArchivedOnly(false);
              setGroup(key);
            }}
            onToggleArchive={() => {
              setArchivedOnly((current) => !current);
              setGroup("all");
            }}
          />

          <div className="desk-list">
            <div className="desk-list-head">
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
            </div>

            <div className="desk-threads" aria-busy={loading}>
              {loading && threads.length === 0 && <p className="desk-empty">{labels.loading}</p>}
              {!loading && threads.length === 0 && (
                <p className="desk-empty">{archivedOnly ? labels.emptyArchive : labels.empty}</p>
              )}
              {threads.map((thread) => (
                <DeskThreadCard
                  key={thread.id}
                  thread={thread}
                  active={thread.id === activeId}
                  onOpen={() => {
                    setActiveId(thread.id);
                    setRoomOpen(true);
                  }}
                />
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
              onEditThread={() => setThreadModal("edit")}
              onArchiveThread={() => void patchThread({ archived: !room.thread.archived })}
              onDeleteThread={() => void removeThread()}
              onEditEntry={setEditingEntry}
              onDeleteEntry={(id) => void removeEntry(id)}
              onDeleteFile={(id) => void removeFile(id)}
            />
          ) : (
            <div className="desk-room desk-room--empty">
              <p className="desk-empty">{labels.pickThread}</p>
            </div>
          )}
        </section>
      </div>

      {threadModal && (
        <DeskThreadModal
          thread={threadModal === "edit" ? (room?.thread ?? null) : null}
          busy={busy}
          error={error}
          onClose={() => setThreadModal(null)}
          onSave={(payload) => void saveThreadForm(payload)}
        />
      )}

      {editingEntry && (
        <DeskEntryModal
          entry={editingEntry}
          busy={busy}
          error={error}
          onClose={() => setEditingEntry(null)}
          onSave={(payload) => void saveEntryForm(payload)}
        />
      )}
    </>
  );
}
