/**
 * Назва в шапці картки: дотик робить її полем — заголовок і є назвою, тож
 * друге поле «Назва» в тілі подвоювало б те саме. Зберігає Enter або вихід із
 * поля; порожній рядок назвою не стає, тож лишається попередня.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerTitleEdit
 */

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import { TRACKER_LIMITS, parseTrackerTitle } from "@wwwuabot/shared/trackers";

interface TrackerTitleEditProps {
  title: string;
  onRename: (title: string) => Promise<boolean>;
}

export function TrackerTitleEdit({ title, onRename }: TrackerTitleEditProps): ReactElement {
  const dialog = useDialog();
  // `null` — не редагуємо: заголовок показує саму назву.
  const [draft, setDraft] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  // Enter і вихід із поля приходять одним дотиком: без охорони назва пішла б
  // двома запитами, і другий переписав би перший тим самим значенням.
  const saving = useRef(false);

  useEffect(() => {
    if (draft !== null) input.current?.focus();
  }, [draft]);

  async function save(): Promise<void> {
    if (draft === null || saving.current) return;
    saving.current = true;
    try {
      const name = parseTrackerTitle(draft);
      // Редагування закривається в обох випадках: інакше невдала назва
      // лишалась би у фокусі й повторювала ту саму відмову на кожен вихід.
      setDraft(null);
      if (name === null) {
        await dialog.alert("Назва — від 1 до 40 символів.", { tone: "danger" });
        return;
      }
      if (name !== title) await onRename(name);
    } finally {
      saving.current = false;
    }
  }

  if (draft === null) {
    return (
      <button
        type="button"
        className="wb-modal-title-btn"
        title="Змінити назву"
        onClick={() => setDraft(title)}
      >
        {title}
      </button>
    );
  }

  return (
    <input
      ref={input}
      className="wb-modal-title-input"
      aria-label="Назва трекера"
      value={draft}
      maxLength={TRACKER_LIMITS.title}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void save();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(null);
        }
      }}
      onBlur={() => void save()}
    />
  );
}
