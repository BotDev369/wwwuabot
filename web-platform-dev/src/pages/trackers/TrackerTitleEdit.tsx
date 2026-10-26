/**
 * Назва в шапці картки: дотик робить її полем — заголовок і є назвою, тож
 * друге поле «Назва» в тілі подвоювало б те саме. Enter або вихід із поля
 * лишають назву в картці чернеткою: на сервер її відправляє «Зберегти».
 * Порожній рядок назвою не стає, тож лишається попередня.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerTitleEdit
 */

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import { TRACKER_LIMITS, parseTrackerTitle } from "@wwwuabot/shared/trackers";

interface TrackerTitleEditProps {
  title: string;
  /** Готова назва: картка тримає її до «Зберегти», сервер тут не викликають. */
  onCommit: (title: string) => void;
}

export function TrackerTitleEdit({ title, onCommit }: TrackerTitleEditProps): ReactElement {
  const dialog = useDialog();
  // `null` — не редагуємо: заголовок показує саму назву.
  const [draft, setDraft] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (draft !== null) input.current?.focus();
  }, [draft]);

  function commit(): void {
    if (draft === null) return;
    const name = parseTrackerTitle(draft);
    // Редагування закривається в обох випадках: інакше невдала назва
    // лишалась би у фокусі й повторювала ту саму відмову на кожен вихід.
    setDraft(null);
    if (name === null) {
      void dialog.alert("Назва — від 1 до 40 символів.", { tone: "danger" });
      return;
    }
    if (name !== title) onCommit(name);
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
          commit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(null);
        }
      }}
      onBlur={commit}
    />
  );
}
