/**
 * Дотик на трекер — картка з записом і діями, а не перехід на сторінку. Запис
 * той самий `TrackerEntryForm`, що й на картці трекера; день ставить сервер.
 * Дії, що щось змінюють (скидання, видалення), питають — `docs/TRACKERS.md`.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerEntryModal
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";
import { MenuModal } from "@wwwuabot/ui/menu";
import { formatTrackerAmount, trackerAmountText, type Tracker } from "@wwwuabot/shared/trackers";
import { TrackerEntryForm, type EntryDraft } from "./TrackerEntryForm";

const EMPTY_DRAFT: EntryDraft = { value: "", note: "" };

interface TrackerEntryModalProps {
  tracker: Tracker;
  /** Зведене значення дня (та сама правда, що в клітинці матриці). */
  todayValue: number | null;
  saving: boolean;
  onClose: () => void;
  onSave: (value: number, note: string) => Promise<boolean>;
  /** «Налаштувати» — картка трекера: звіт, історія, публічність. */
  onSettings: () => void;
  /** «Дублювати» — копія визначення; історія не копіюється. `false` — не вийшло. */
  onDuplicate: () => Promise<boolean>;
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
  onSettings,
  onDuplicate,
  onReset,
  onDelete,
}: TrackerEntryModalProps): ReactElement {
  const dialog = useDialog();
  const [draft, setDraft] = useState<EntryDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);

  const todayLabel =
    todayValue === null
      ? "Сьогодні ще немає запису"
      : `Сьогодні: ${trackerAmountText(todayValue, tracker)}${
          tracker.valueType === "number" && tracker.goal !== null
            ? ` · ціль ${formatTrackerAmount(tracker.goal, tracker.unit)}`
            : ""
        }`;
  // Смуга цілі — скільки дня вже зроблено; без цілі (або не в числі) її немає.
  const progress =
    tracker.valueType === "number" && tracker.goal !== null && tracker.goal > 0
      ? Math.min(100, Math.round(((todayValue ?? 0) / tracker.goal) * 100))
      : null;

  async function submit(): Promise<void> {
    if (busy) return;
    // «Так-ні» не вводиться цифрою: порожній вибір — це ще не відповідь, а не «0».
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
    <MenuModal
      title={tracker.title}
      variant="card"
      onClose={onClose}
      content={
        <div className="wb-tracker-sheet">
          <div className="wb-tracker-sheet-hero">
            <span className="wb-tracker-sheet-icon" aria-hidden="true">
              <Icon name={tracker.icon} size={22} />
            </span>
            <div className="wb-tracker-sheet-status">
              <p
                className={
                  todayValue === null
                    ? "wb-tracker-sheet-today"
                    : "wb-tracker-sheet-today wb-tracker-sheet-today--done"
                }
              >
                {todayLabel}
              </p>
              {progress !== null && (
                <div className="wb-tracker-sheet-progress">
                  <span
                    className="wb-tracker-sheet-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <TrackerEntryForm
            tracker={tracker}
            draft={draft}
            saving={saving || busy}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            onSubmit={() => void submit()}
          />

          <div className="wb-tracker-actions">
            <button
              type="button"
              className="wb-btn wb-btn-secondary wb-tracker-action"
              onClick={onSettings}
            >
              <Icon name="sliders" size={18} />
              Налаштувати
            </button>
            <button
              type="button"
              className="wb-btn wb-btn-ghost wb-tracker-action"
              onClick={() => void duplicate()}
            >
              <Icon name="copy" size={18} />
              Дублювати
            </button>
            {todayValue !== null && (
              <button
                type="button"
                className="wb-btn wb-btn-ghost wb-tracker-action"
                onClick={() => void reset()}
              >
                <Icon name="eraser" size={18} />
                Скинути сьогодні
              </button>
            )}
            {/* Видалення — червоне словом, а не залитою пілюлею: найгучніша
                плитка картки не мусить бути тією, що прибирає трекер. */}
            <button
              type="button"
              className="wb-btn wb-btn-ghost wb-tracker-action wb-tracker-action--danger"
              onClick={() => void remove()}
            >
              <Icon name="trash" size={18} />
              Видалити
            </button>
          </div>
        </div>
      }
    />
  );
}
