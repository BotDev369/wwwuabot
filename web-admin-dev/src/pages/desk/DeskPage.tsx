/**
 * «Стіл» — спільний простір Сергія й Buffy: шапка з «+», два вибори
 * (чия черга, активні/архів), таблиця `DataTable` і модалка справи зі
 * стрічкою та композером — як решта адмінки.
 *
 * @module web-admin-dev/src/pages/desk/DeskPage
 */

import { useCallback, useEffect, useState } from "react";
import { icons } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";
import { DataTable, type DataTableColumn } from "@wwwuabot/ui/table";
import { PageTopbar } from "../../layout/PageTopbar";
import { GlobalScopeBadge } from "../tenant/GlobalScopeBadge";
import { useListMemory } from "../../shared/storage/list-memory";
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
import { DeskItemModal } from "./DeskItemModal";
import { DeskThreadModal, type DeskThreadPayload } from "./DeskThreadModal";
import {
  lastEntryId,
  statusTone,
  toRoomView,
  toThreadView,
  turnTone,
  type DeskEntryView,
  type DeskRoomView,
  type DeskThreadView,
} from "./desk-view";

const STATUSES = labels.statuses as Record<string, string>;
const TURNS = labels.turns as Record<string, string>;
const UNITS = labels.units;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : labels.failed;
}

export function DeskPage() {
  const dialog = useDialog();
  const [items, setItems] = useState<DeskThreadView[]>([]);
  // Черга й архів — частина вигляду: стіл відкривається там, де його лишили.
  const [view, setView] = useListMemory("desk", (raw) => ({
    queue: typeof raw?.queue === "string" ? raw.queue : "all",
    archived: typeof raw?.archived === "string" ? raw.archived : "hide",
  }));
  const { queue, archived } = view;
  const [openId, setOpenId] = useState<number | null>(null);
  const [item, setItem] = useState<DeskRoomView | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState<"create" | "edit" | null>(null);
  const [entryForm, setEntryForm] = useState<DeskEntryView | null>(null);

  const refresh = useCallback(() => setReload((current) => current + 1), []);

  // Список: черга й архів — єдині два вибори, решта вирішується словами.
  useEffect(() => {
    let alive = true;
    fetchDeskThreads({ turn: queue, archived })
      .then((data) => {
        if (!alive) return;
        setItems(data.threads.map(toThreadView));
        setError("");
      })
      .catch((cause: unknown) => alive && setError(messageOf(cause)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [queue, archived, reload]);

  // Відкрита справа: свіжа стрічка й позначка «вичитано до останнього запису».
  useEffect(() => {
    if (openId === null) return;
    let alive = true;
    fetchDeskThread(openId)
      .then((data) => {
        if (!alive) return;
        setItem(toRoomView(data, UNITS));
        const seen = lastEntryId(data.entries);
        if (seen > 0) void markDeskRead(data.thread.id, seen).catch(() => undefined);
        setError("");
      })
      .catch((cause: unknown) => alive && setError(messageOf(cause)));
    return () => {
      alive = false;
    };
  }, [openId, reload]);

  async function saveItemForm(payload: DeskThreadPayload): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = { ...payload };
      if (form === "edit" && item) body.id = item.thread.id;
      const saved = await saveDeskThread(body);
      setForm(null);
      setItem(toRoomView(saved, UNITS));
      setOpenId(saved.thread.id);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function patchItem(patch: Record<string, unknown>): Promise<void> {
    if (!item) return;
    const thread = item.thread;
    setBusy(true);
    setError("");
    try {
      const saved = await saveDeskThread({
        id: thread.id,
        title: thread.title,
        turn: thread.turn,
        status: thread.status,
        ...patch,
      });
      setItem(toRoomView(saved, UNITS));
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string, files: File[]): Promise<void> {
    if (!item) return;
    const body = text.trim() || files.map((file) => file.name).join(", ");
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      const saved = await addDeskEntry({ thread_id: item.thread.id, kind: "note", body });
      for (const file of files)
        await uploadDeskFile(item.thread.id, lastEntryId(saved.entries), file);
      setItem(toRoomView(saved, UNITS));
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveEntryForm(body: string): Promise<void> {
    if (!entryForm || !item) return;
    setBusy(true);
    setError("");
    try {
      const saved = await addDeskEntry({
        id: entryForm.id,
        thread_id: item.thread.id,
        kind: entryForm.kind,
        body,
      });
      setEntryForm(null);
      setItem(toRoomView(saved, UNITS));
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(): Promise<void> {
    if (!item) return;
    const yes = await dialog.confirm(labels.deleteItemQuestion, {
      tone: "danger",
      confirmText: labels.confirmDelete,
    });
    if (!yes) return;
    try {
      await deleteDeskThread(item.thread.id);
      setItem(null);
      setOpenId(null);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    }
  }

  async function removeEntry(id: number): Promise<void> {
    const yes = await dialog.confirm(labels.deleteEntryQuestion, {
      tone: "danger",
      confirmText: labels.confirmDelete,
    });
    if (!yes) return;
    try {
      await deleteDeskEntry(id);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    }
  }

  async function removeFile(id: number): Promise<void> {
    const yes = await dialog.confirm(labels.deleteFileQuestion, {
      tone: "danger",
      confirmText: labels.confirmDelete,
    });
    if (!yes) return;
    try {
      await deleteDeskFile(id);
      refresh();
    } catch (cause: unknown) {
      setError(messageOf(cause));
    }
  }

  const columns: readonly DataTableColumn<DeskThreadView>[] = [
    {
      key: "title",
      header: labels.titleColumn,
      width: 150,
      render: (row) => (
        <>
          <span className="wb-cell-title">{row.title}</span>
          <span className={`wb-badge ${statusTone(row.status)}`}>
            {STATUSES[row.status] ?? row.status}
          </span>
          {row.unread > 0 && <span className="wb-badge wb-badge-accent">{labels.unread}</span>}
        </>
      ),
    },
    {
      key: "turn",
      header: labels.queueColumn,
      width: 96,
      className: "wb-cell-nowrap",
      render: (row) => (
        <span className={`wb-badge ${turnTone(row.turn)}`}>{TURNS[row.turn] ?? row.turn}</span>
      ),
    },
    {
      key: "when",
      header: labels.whenColumn,
      width: 84,
      className: "wb-cell-nowrap",
      render: (row) => row.updated,
    },
  ];

  return (
    <>
      <PageTopbar>
        <div className="wb-topbar-left">
          <h1 className="wb-topbar-title">{labels.title}</h1>
          <GlobalScopeBadge />
          {items.length > 0 && <span className="wb-count">{items.length}</span>}
        </div>
        <button
          type="button"
          className="wb-tools-add"
          aria-label={labels.newItem}
          title={labels.newItem}
          onClick={() => setForm("create")}
        >
          {icons["plus"]}
        </button>
      </PageTopbar>

      <div className="wb-page-body">
        <div className="desk-filters">
          <select
            className="wb-input"
            aria-label={labels.queueFilter}
            value={queue}
            onChange={(event) => setView({ queue: event.target.value })}
          >
            <option value="all">{`${labels.queueLabel}: ${labels.queueAll}`}</option>
            <option value="serhii">{TURNS.serhii}</option>
            <option value="buffy">{TURNS.buffy}</option>
          </select>
          <select
            className="wb-input"
            aria-label={labels.archiveFilter}
            value={archived}
            onChange={(event) => setView({ archived: event.target.value })}
          >
            <option value="hide">{`${labels.archiveLabel}: ${labels.archiveActive}`}</option>
            <option value="only">{`${labels.archiveLabel}: ${labels.archiveOnly}`}</option>
          </select>
        </div>

        <DataTable
          columns={columns}
          rows={items}
          rowKey={(row) => String(row.id)}
          empty={
            loading ? labels.loading : archived === "only" ? labels.archiveEmpty : labels.empty
          }
          selectedKey={openId === null ? null : String(openId)}
          minWidth={340}
          onRowClick={(row) => setOpenId(row.id)}
        />

        {error && <p className="desk-error">{error}</p>}
      </div>

      {item && (
        <DeskItemModal
          item={item}
          busy={busy}
          error={error}
          onClose={() => {
            setItem(null);
            setOpenId(null);
          }}
          onSend={(text, files) => void send(text, files)}
          onEditItem={() => setForm("edit")}
          onArchiveItem={() => void patchItem({ archived: !item.thread.archived })}
          onDeleteItem={() => void removeItem()}
          onEditEntry={setEntryForm}
          onDeleteEntry={(id) => void removeEntry(id)}
          onDeleteFile={(id) => void removeFile(id)}
        />
      )}

      {form && (
        <DeskThreadModal
          item={form === "edit" ? (item?.thread ?? null) : null}
          busy={busy}
          error={error}
          onClose={() => setForm(null)}
          onSave={(payload) => void saveItemForm(payload)}
        />
      )}

      {entryForm && (
        <DeskEntryModal
          entry={entryForm}
          busy={busy}
          error={error}
          onClose={() => setEntryForm(null)}
          onSave={(body) => void saveEntryForm(body)}
        />
      )}
    </>
  );
}
