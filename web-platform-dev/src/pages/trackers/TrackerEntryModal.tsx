/**
 * Дотик на трекер — картка запису й дій, а не сторінка (`docs/TRACKERS.md`):
 * назва, пріоритет і публічність — чернетка, до «Зберегти» сервер про них не
 * знає, тож акцент кнопки — «є що зберігати». Дії стоять зонами, день ставить
 * сервер.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerEntryModal
 */

import { useState, type ReactElement } from "react";
import { Icon, SwitchRow } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";
import { MenuModal } from "@wwwuabot/ui/menu";
import type { Tracker } from "@wwwuabot/shared/trackers";
import { TrackerEntryForm, type EntryDraft } from "./TrackerEntryForm";
import { TrackerPriorityModal } from "./TrackerPriorityModal";
import { TrackerTitleEdit } from "./TrackerTitleEdit";

const EMPTY_DRAFT: EntryDraft = { value: "", note: "" };

interface TrackerEntryModalProps {
  tracker: Tracker;
  /** Зведене значення дня (та сама правда, що в клітинці матриці). */
  todayValue: number | null;
  saving: boolean;
  onClose: () => void;
  onSave: (value: number, note: string) => Promise<boolean>;
  /** «Аналітика» — поверхня над карткою: графік, звіт та історія. */
  onAnalytics: () => void;
  /** Публічність визначення: інші бачать форму мірки, а записи — ніколи. */
  onPublic: (isPublic: boolean) => Promise<boolean>;
  /** «Дублювати» — копія визначення; історія не копіюється. `false` — не вийшло. */
  onDuplicate: () => Promise<boolean>;
  /** «Перемістити» — дерево груп поверхнею над карткою. */
  onMove: () => void;
  /** Нова назва з шапки; `false` — не вдалось, назва лишається старою. */
  onRename: (title: string) => Promise<boolean>;
  /** Пріоритет 1–9; `null` — прибрати рівень. */
  onPriority: (priority: number | null) => Promise<boolean>;
  /** «Скинути сьогодні»: прибрати сьогоднішні виміри. */
  onReset: () => Promise<number | null>;
  onDelete: () => Promise<boolean>;
}

export function TrackerEntryModal({
  tracker,
  todayValue,
  saving,
  onClose,
  onSave,
  onAnalytics,
  onPublic,
  onDuplicate,
  onMove,
  onRename,
  onPriority,
  onReset,
  onDelete,
}: TrackerEntryModalProps): ReactElement {
  const dialog = useDialog();
  const [draft, setDraft] = useState<EntryDraft>(EMPTY_DRAFT);
  const [title, setTitle] = useState(tracker.title);
  const [priority, setPriority] = useState<number | null>(tracker.priority ?? null);
  const [isPublic, setIsPublic] = useState(tracker.isPublic ?? false);
  const [busy, setBusy] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const savedPriority = tracker.priority ?? null;
  const savedPublic = tracker.isPublic ?? false;
  // Поля картки міняються лише чернеткою: одна «Зберегти» фіксує їх усі.
  const fieldsDirty =
    title !== tracker.title || priority !== savedPriority || isPublic !== savedPublic;
  const entryFilled = draft.value.trim() !== "" || draft.note.trim() !== "";
  // Акцент у «Зберегти» — це «є що зберігати»: порожня картка не кличе діяти.
  const dirty = fieldsDirty || entryFilled;

  /** Запис із чернетки; `null` — вводити ще нічого, але причина вже сказана. */
  async function readEntry(): Promise<{ value: number } | null> {
    // «Так-ні» обирається вкладкою: порожній вибір — це ще не відповідь, а не «0».
    if (tracker.valueType === "boolean") {
      if (draft.value !== "0" && draft.value !== "1") {
        await dialog.alert("Оберіть «Так» або «Ні».", { tone: "danger" });
        return null;
      }
      return { value: Number(draft.value) };
    }
    const raw = draft.value.replace(",", ".").trim();
    const value = Number(raw);
    if (!raw || !Number.isFinite(value)) {
      await dialog.alert("Введіть число — скільки вийшло.", { tone: "danger" });
      return null;
    }
    return { value };
  }

  async function submit(): Promise<void> {
    if (busy || saving) return;
    let value: number | null = null;
    if (entryFilled) {
      const entry = await readEntry();
      if (entry === null) return;
      value = entry.value;
    } else if (!fieldsDirty) {
      // Порожня картка не має що зберігати — кажемо причину, як і раніше.
      await dialog.alert(
        tracker.valueType === "boolean"
          ? "Оберіть «Так» або «Ні»."
          : "Введіть число — скільки вийшло.",
        { tone: "danger" },
      );
      return;
    }

    setBusy(true);
    let ok = true;
    if (ok && title !== tracker.title) ok = await onRename(title);
    if (ok && priority !== savedPriority) ok = await onPriority(priority);
    if (ok && isPublic !== savedPublic) ok = await onPublic(isPublic);
    if (ok && value !== null) ok = await onSave(value, draft.note.trim());
    setBusy(false);
    if (ok) onClose();
  }

  async function reset(): Promise<void> {
    const ok = await dialog.confirm(`Скинути сьогоднішні записи «${tracker.title}»?`, {
      tone: "danger",
      confirmText: "Скинути",
    });
    if (ok) await onReset();
  }

  async function duplicate(): Promise<void> {
    // Картка лишається, якщо копія не створилась: закрити її — це сховати
    // причину разом із дією, яку людина щойно обрала.
    if (await onDuplicate()) onClose();
  }

  async function remove(): Promise<void> {
    const ok = await dialog.confirm(
      `Видалити «${tracker.title}»? Виміри лишаться в базі, трекер зникне зі стрічки.`,
      { tone: "danger", confirmText: "Видалити" },
    );
    if (!ok || !(await onDelete())) return;
    onClose();
  }

  return (
    <>
      <MenuModal
        title={title}
        titleSlot={<TrackerTitleEdit title={title} onCommit={setTitle} />}
        variant="card"
        onClose={onClose}
        content={
          <TrackerEntryForm
            tracker={tracker}
            draft={draft}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            onSubmit={() => void submit()}
          >
            <div className="wb-tracker-actions">
              <button
                type="button"
                className="wb-btn wb-btn-secondary wb-tracker-action"
                aria-label={`Пріоритет: ${priority === null ? "відсутній" : priority}`}
                onClick={() => setPriorityOpen(true)}
              >
                <Icon name="sort" size={16} />
                {priority === null ? "Пріоритет" : `Пріоритет: ${priority}`}
              </button>
              <button
                type="button"
                className="wb-btn wb-btn-secondary wb-tracker-action"
                onClick={onAnalytics}
              >
                <Icon name="bar-chart" size={16} />
                Аналітика
              </button>
              <button
                type="button"
                className="wb-btn wb-btn-secondary wb-tracker-action"
                onClick={() => void duplicate()}
              >
                <Icon name="copy" size={16} />
                Дублювати
              </button>
              <button
                type="button"
                className="wb-btn wb-btn-secondary wb-tracker-action"
                onClick={onMove}
              >
                <Icon name="folder" size={16} />
                Перемістити
              </button>
              {todayValue !== null && (
                <button
                  type="button"
                  className="wb-btn wb-btn-secondary wb-tracker-action"
                  onClick={() => void reset()}
                >
                  <Icon name="eraser" size={16} />
                  Скинути сьогодні
                </button>
              )}
            </div>

            <div className="wb-tracker-public">
              <SwitchRow
                label="Публічний"
                hint="Інші бачать лише форму мірки. Записи не публікуються ніколи."
                checked={isPublic}
                onToggle={setIsPublic}
              />
            </div>

            <div className="wb-tracker-bottom">
              <button
                type="button"
                className="wb-btn wb-btn-secondary wb-tracker-action"
                onClick={() => void remove()}
              >
                <Icon name="trash" size={16} />
                Видалити
              </button>
              <button
                type="submit"
                className={`wb-btn wb-tracker-action ${dirty ? "wb-btn-primary" : "wb-btn-secondary"}`}
                disabled={saving || busy}
              >
                <Icon name="check" size={16} />
                Зберегти
              </button>
            </div>
          </TrackerEntryForm>
        }
      />

      {priorityOpen && (
        <TrackerPriorityModal
          title="Пріоритет"
          value={priority}
          onClose={() => setPriorityOpen(false)}
          onPick={(next) => {
            setPriorityOpen(false);
            if (next !== undefined) setPriority(next);
          }}
        />
      )}
    </>
  );
}
