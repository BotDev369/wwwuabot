/**
 * Дотик на трекер — картка з записом і діями, а не перехід на сторінку. Назва
 * в шапці редагується дотиком: заголовок — це і є назва. Дії стоять зонами:
 * запис, публічність, решта дій і прибирання — а не купою різноширинних плиток.
 * День ставить сервер; дії, що щось змінюють, питають (`docs/TRACKERS.md`).
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
  /** «Аналітика» — окрема поверхня: графік, звіт та історія. */
  onAnalytics: () => void;
  /** Публічність визначення: інші бачать форму мірки, а записи — ніколи. */
  onPublic: (isPublic: boolean) => Promise<boolean>;
  /** «Дублювати» — копія визначення; історія не копіюється. `false` — не вийшло. */
  onDuplicate: () => Promise<boolean>;
  /** «Перемістити» — дерево груп у наступній поверхні (картка закривається). */
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
  const [busy, setBusy] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const priority = tracker.priority ?? null;

  async function submit(): Promise<void> {
    if (busy) return;
    // «Так-ні» обирається вкладкою: порожній вибір — це ще не відповідь, а не «0».
    if (tracker.valueType === "boolean") {
      if (draft.value !== "0" && draft.value !== "1") {
        await dialog.alert("Оберіть «Так» або «Ні».", { tone: "danger" });
        return;
      }
      setBusy(true);
      const saved = await onSave(Number(draft.value), draft.note.trim());
      setBusy(false);
      if (saved) onClose();
      return;
    }
    const raw = draft.value.replace(",", ".").trim();
    const value = Number(raw);
    if (!raw || !Number.isFinite(value)) {
      await dialog.alert("Введіть число — скільки вийшло.", { tone: "danger" });
      return;
    }
    setBusy(true);
    const saved = await onSave(value, draft.note.trim());
    setBusy(false);
    if (saved) onClose();
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
        title={tracker.title}
        titleSlot={<TrackerTitleEdit title={tracker.title} onRename={onRename} />}
        variant="card"
        onClose={onClose}
        content={
          <div className="wb-tracker-sheet">
            <TrackerEntryForm
              tracker={tracker}
              draft={draft}
              saving={saving || busy}
              onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
              onSubmit={() => void submit()}
              aside={
                <button
                  type="button"
                  className="wb-btn wb-btn-secondary wb-tracker-priority"
                  aria-label={`Пріоритет: ${priority === null ? "відсутній" : priority}`}
                  onClick={() => setPriorityOpen(true)}
                >
                  <Icon name="sort" size={16} />
                  {priority === null ? "Пріоритет" : `Пріоритет: ${priority}`}
                </button>
              }
            />

            <div className="wb-tracker-public">
              <SwitchRow
                label="Публічний"
                hint="Інші бачать лише форму мірки. Записи не публікуються ніколи."
                checked={tracker.isPublic ?? false}
                onToggle={(next: boolean) => void onPublic(next)}
              />
            </div>

            <div className="wb-tracker-actions">
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

            <button
              type="button"
              className="wb-btn wb-btn-ghost wb-tracker-remove"
              onClick={() => void remove()}
            >
              <Icon name="trash" size={16} />
              Видалити
            </button>
          </div>
        }
      />

      {priorityOpen && (
        <TrackerPriorityModal
          title="Пріоритет"
          value={priority}
          onClose={() => setPriorityOpen(false)}
          onPick={(next) => {
            setPriorityOpen(false);
            if (next !== undefined) void onPriority(next);
          }}
        />
      )}
    </>
  );
}
