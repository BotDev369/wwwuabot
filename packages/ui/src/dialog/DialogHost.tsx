/**
 * DialogHost — сам діалог: заголовок, текст, поле вводу, дві кнопки.
 *
 * Малюється тими самими `.wb-modal-*`, що й решта модалок проєкту, тож
 * діалог виглядає однаково в обох оболонках — окремий дизайн не потрібен.
 * Стан живе в самому компоненті, а `DialogProvider` дає йому `key={id}`, тому
 * кожен новий діалог починається з чистого стану без жодного ефекту-скидання.
 *
 * @module @wwwuabot/ui/dialog
 */

import { useRef, useState } from "react";
import type { DialogRequest } from "./types";

interface DialogHostProps {
  request: DialogRequest;
  onSettle: (value: string | boolean | null) => void;
}

const DEFAULT_TITLES: Record<DialogRequest["kind"], string> = {
  alert: "Повідомлення",
  confirm: "Підтвердження",
  prompt: "Введення",
};

export function DialogHost({ request, onSettle }: DialogHostProps) {
  const [value, setValue] = useState(request.defaultValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const title = request.title ?? DEFAULT_TITLES[request.kind];

  const cancel = () => onSettle(request.kind === "confirm" ? false : null);

  const submit = () => {
    if (request.kind === "prompt") {
      const message = request.validate?.(value) ?? null;
      if (message) {
        setError(message);
        inputRef.current?.focus();
        return;
      }
      onSettle(value);
      return;
    }
    onSettle(request.kind === "confirm" ? true : null);
  };

  return (
    <div className="wb-modal-overlay" onClick={cancel}>
      <div
        className="wb-modal wb-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            cancel();
          }
          if (e.key === "Enter") submit();
        }}
      >
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">{title}</h3>
        </div>

        <div className="wb-modal-body wb-dialog-body">
          <p className="wb-dialog-message">{request.message}</p>

          {request.kind === "prompt" && (
            <>
              <input
                ref={inputRef}
                autoFocus
                className="wb-input"
                type={request.inputType}
                value={value}
                placeholder={request.placeholder}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
              />
              {error && (
                <p className="wb-dialog-error" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="wb-modal-footer wb-dialog-footer">
          {request.kind !== "alert" && (
            <button
              type="button"
              className="wb-btn wb-btn-secondary wb-dialog-btn"
              onClick={cancel}
            >
              {request.cancelText}
            </button>
          )}
          <button
            type="button"
            className={`wb-btn ${request.tone === "danger" ? "wb-btn-danger" : "wb-btn-primary"} wb-dialog-btn`}
            onClick={submit}
          >
            {request.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
