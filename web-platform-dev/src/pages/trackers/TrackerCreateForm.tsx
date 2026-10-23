/**
 * Власний трекер: три блоки — куди зберегти (група першою: вибір — модалка з
 * деревом), що відстежуємо (назва й тип запису) і як рахувати (одиниця, ціль,
 * крок, вид запису). Перевіряє форму та сама `validateTrackerFields`, що й
 * сервер (AGENTS.md §3); вид питаємо прямо, а не вгадуємо за ціллю.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerCreateForm
 */

import { useState, type FormEvent, type ReactElement } from "react";
import { Tabs, type TabOption } from "@wwwuabot/ui/tabs";
import {
  TRACKER_LIMITS,
  TRACKER_UNIT_GROUPS,
  validateTrackerFields,
  type Tracker,
  type TrackerFields,
  type TrackerGroup,
  type TrackerMode,
  type TrackerValueType,
} from "@wwwuabot/shared/trackers";
import { TrackerGroupPicker } from "./TrackerGroupPicker";
import { trackerDraftSummary } from "./trackers-view";

const MODE_TABS: readonly TabOption<TrackerMode>[] = [
  { key: "sum", label: "Сума за день" },
  { key: "read", label: "Останнє значення" },
];

/** Що обраний вид означає для людини — прикладами, а не визначенням. */
const MODE_HINT: Record<TrackerMode, string> = {
  sum: "Записи одного дня додаються: вода, кроки, витрати.",
  read: "Видно останнє значення: вага, тиск, настрій.",
};

const TYPE_TABS: readonly TabOption<TrackerValueType>[] = [
  { key: "number", label: "Число" },
  { key: "boolean", label: "Так-ні" },
];

/** Що тип запису означає для людини — тим самим тоном, що й вид. */
const TYPE_HINT: Record<TrackerValueType, string> = {
  number: "Скільки: вода, кроки, витрати, вага.",
  boolean: "Один статус дня: тренування, «не палю».",
};

/** Значення одиниці, яке стоїть у виборі, коли людина пише свою. */
const CUSTOM_UNIT = "custom";

interface TrackerCreateFormProps {
  groups: readonly TrackerGroup[];
  onCreate: (fields: TrackerFields, groupId: number | null) => Promise<Tracker | null>;
  onCreated: (tracker: Tracker) => void;
  onCancel: () => void;
  /** Створити нову верхню групу з модалки вибору; немає — кнопки немає. */
  onCreateGroup?: (title: string) => Promise<TrackerGroup | null>;
  /** Група з адреси (`group=<id>`): форма відкрита з меню самої групи. */
  initialGroupId?: number | null;
}

function numberOrNull(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function TrackerCreateForm({
  groups,
  onCreate,
  onCreated,
  onCancel,
  onCreateGroup,
  initialGroupId,
}: TrackerCreateFormProps): ReactElement {
  const [title, setTitle] = useState("");
  const [valueType, setValueType] = useState<TrackerValueType>("number");
  // Група — вибір, а не текст: `undefined` — людина ще не обирала, `null` —
  // «Свої», решта — id з модалки з деревом. Відкрили з меню групи — вона вже обрана.
  const [group, setGroup] = useState<number | null | undefined>(initialGroupId ?? undefined);
  const [unit, setUnit] = useState("");
  // Своя одиниця — не рядок у стані, а ознака вибору: довідник і свій текст
  // живуть в одному полі `unit`, і форма лише знає, показувати чи ні ввід.
  const [customUnit, setCustomUnit] = useState(false);
  const [goal, setGoal] = useState("");
  // Без дефолтної цифри: порожній крок — це крок 1 (`?? 1` нижче), а число в
  // полі, яке ніхто не міняв, читається як чиясь вимога, а не як типовий вибір.
  const [step, setStep] = useState("");
  const [mode, setMode] = useState<TrackerMode>("sum");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const typedGoal = numberOrNull(goal);
  const summary = trackerDraftSummary({
    valueType,
    unit,
    goal: typedGoal === null ? null : Number.isFinite(typedGoal) ? typedGoal : null,
  });

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    const validated = validateTrackerFields({
      title,
      unit,
      goal: typedGoal,
      step: numberOrNull(step) ?? 1,
      min: 0,
      valueType,
      // Вид «так-ні» не подаємо: блок вибору приховано, тож типовий ставить
      // сервер (`validateTrackerFields` → «останній»), а не невидимий вибір.
      ...(valueType === "number" ? { mode } : {}),
    });
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    setError(null);
    setBusy(true);
    const tracker = await onCreate(validated.value, group ?? null);
    setBusy(false);
    if (tracker) onCreated(tracker);
  }

  return (
    <form className="wb-tracker-form" onSubmit={(event) => void submit(event)}>
      <section className="wb-tracker-form-zone">
        <div className="wb-tracker-form-zone-title" role="heading" aria-level={3}>
          Куди зберегти
        </div>
        <TrackerGroupPicker
          label="Група"
          groups={groups}
          value={group}
          onPick={setGroup}
          onCreate={onCreateGroup}
        />
      </section>

      <section className="wb-tracker-form-zone">
        <div className="wb-tracker-form-zone-title" role="heading" aria-level={3}>
          Що відстежуємо
        </div>
        <label className="wb-field">
          <span className="wb-label">Назва</span>
          <input
            className="wb-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Наприклад, кава"
            maxLength={40}
          />
        </label>
        <div className="wb-field">
          <span className="wb-label">Тип запису</span>
          <Tabs options={TYPE_TABS} value={valueType} onChange={setValueType} label="Тип запису" />
          <div className="wb-field-hint">{TYPE_HINT[valueType]}</div>
        </div>
      </section>

      {/* «Так-ні» не має ні одиниці, ні цілі, ні кроку — це статус дня, а не
          міра; сервер теж відкидає ці поля для нього (див. `validateTrackerFields`). */}
      {valueType === "number" && (
        <section className="wb-tracker-form-zone">
          <div className="wb-tracker-form-zone-title" role="heading" aria-level={3}>
            Як рахувати
          </div>
          <div className="wb-tracker-form-row">
            <label className="wb-field">
              <span className="wb-label">Одиниця</span>
              <select
                className="wb-select"
                value={customUnit ? CUSTOM_UNIT : unit}
                onChange={(event) => {
                  const chosen = event.target.value;
                  if (chosen === CUSTOM_UNIT) setCustomUnit(true);
                  else {
                    setCustomUnit(false);
                    setUnit(chosen);
                  }
                }}
              >
                <option value="">Без одиниці</option>
                {/* Групи — підписи спорідненості (час із часом): сама одиниця
                    лишається текстом, тож старі трекери читаються як читалися. */}
                {TRACKER_UNIT_GROUPS.map((group) => (
                  <optgroup key={group.key} label={group.title}>
                    {group.units.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value={CUSTOM_UNIT}>Своя одиниця…</option>
              </select>
            </label>
            <label className="wb-field">
              <span className="wb-label">Ціль дня</span>
              <input
                className="wb-input"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                inputMode="decimal"
                placeholder="без цілі"
              />
            </label>
          </div>
          {customUnit && (
            <label className="wb-field">
              <span className="wb-label">Своя одиниця</span>
              <input
                className="wb-input"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="чашок"
                maxLength={TRACKER_LIMITS.unit}
              />
            </label>
          )}
          <label className="wb-field">
            <span className="wb-label">Крок</span>
            <input
              className="wb-input"
              value={step}
              onChange={(event) => setStep(event.target.value)}
              inputMode="decimal"
              placeholder="1"
            />
          </label>
          {/* Вид «так-ні» не питають: блок ховається повністю, бо статус дня не
              сума — типовий вид цього типу ставить сервер (`validateTrackerFields`),
              а вибір, який ніхто не бачить, — це дві правди. */}
          <div className="wb-field">
            <span className="wb-label">Як читати записи</span>
            <Tabs options={MODE_TABS} value={mode} onChange={setMode} label="Як читати записи" />
            <div className="wb-field-hint">{MODE_HINT[mode]}</div>
          </div>
        </section>
      )}

      {error && <p className="wb-tracker-form-error">{error}</p>}

      <div className="wb-tracker-form-actions">
        {/* Огляду без назви немає: порожній рядок «Без назви · Число» — це шум,
            а створити трекер без назви все одно не вийде. */}
        {title.trim() && (
          <p className="wb-tracker-form-summary">
            <span className="wb-tracker-form-summary-name">{title.trim()}</span>
            <span className="wb-tracker-form-summary-meta">{summary}</span>
          </p>
        )}
        <div className="wb-tracker-form-buttons">
          <button type="button" className="wb-btn wb-btn-ghost" onClick={onCancel}>
            Скасувати
          </button>
          <button
            type="submit"
            className="wb-btn wb-btn-primary wb-tracker-form-submit"
            disabled={busy}
          >
            Створити
          </button>
        </div>
      </div>
    </form>
  );
}
