import { useEffect, useRef, useState } from "react";
import { KeyboardEditor } from "./KeyboardEditor";
import { parseKeyboard, serializeKeyboard, validateKeyboard } from "./keyboard.utils";
import type { KeyboardRowModel } from "./types";

interface Props {
  value: string; // сирий JSON з form.buttons
  onChange: (v: string) => void;
}

export function ButtonsField({ value, onChange }: Props) {
  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [rows, setRows] = useState<KeyboardRowModel[]>(() => parseKeyboard(value));
  const [jsonText, setJsonText] = useState(value);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const lastEmitted = useRef(value);

  // Якщо value змінилась ззовні (завантажили сценарій) — ресинхронізуємось.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setRows(parseKeyboard(value));
      setJsonText(value);
    }
  }, [value]);

  function emit(next: string) {
    lastEmitted.current = next;
    onChange(next);
  }

  function handleRowsChange(next: KeyboardRowModel[]) {
    setRows(next);
    emit(serializeKeyboard(next));
  }

  function switchMode(next: "visual" | "json") {
    if (next === mode) return;
    if (next === "json") {
      const serialized = serializeKeyboard(rows);
      setJsonText(serialized);
      emit(serialized);
      setJsonError(null);
      setMode("json");
    } else {
      const err = validateKeyboard(jsonText);
      if (err) {
        setJsonError(err);
        return;
      }
      setRows(parseKeyboard(jsonText));
      setJsonError(null);
      setMode("visual");
    }
  }

  function handleJsonChange(text: string) {
    setJsonText(text);
    emit(text); // сирим; фінальна валідація — при збереженні форми
  }

  return (
    <>
      <div className="kb-toggle">
        <button type="button" className={`kb-toggle-btn${mode === "visual" ? " kb-toggle-btn--active" : ""}`} onClick={() => switchMode("visual")}>
          Візуально
        </button>
        <button type="button" className={`kb-toggle-btn${mode === "json" ? " kb-toggle-btn--active" : ""}`} onClick={() => switchMode("json")}>
          JSON
        </button>
      </div>
      {mode === "visual" ? (
        <KeyboardEditor rows={rows} onChange={handleRowsChange} />
      ) : (
        <>
          <textarea className="block-textarea" rows={6} value={jsonText} onChange={(e) => handleJsonChange(e.target.value)} />
          {jsonError && <p className="kb-json-error">JSON: {jsonError}</p>}
        </>
      )}
    </>
  );
}