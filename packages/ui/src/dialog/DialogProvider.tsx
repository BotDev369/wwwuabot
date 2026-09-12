/**
 * DialogProvider — дає застосунку `useDialog()`.
 *
 * Тримає чергу запитів: обробники часто викликають діалог один за одним
 * (`alert` після невдалого `confirm`), і без черги другий запит перезаписав би
 * перший — його проміс не завершився б ніколи.
 *
 * @module @wwwuabot/ui/dialog
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { DialogContext } from "./DialogContext";
import { DialogHost } from "./DialogHost";
import type {
  AlertOptions,
  ConfirmOptions,
  DialogApi,
  DialogRequest,
  PromptOptions,
} from "./types";

interface DialogProviderProps {
  children: ReactNode;
}

const DEFAULTS = {
  tone: "neutral" as const,
  confirmText: "Гаразд",
  cancelText: "Скасувати",
  defaultValue: "",
  placeholder: "",
  inputType: "text" as const,
};

function toRequest(
  id: number,
  kind: DialogRequest["kind"],
  message: string,
  options: AlertOptions & Partial<PromptOptions> & Partial<ConfirmOptions>,
  resolve: DialogRequest["resolve"],
): DialogRequest {
  return {
    id,
    kind,
    message,
    resolve,
    tone: options.tone ?? DEFAULTS.tone,
    title: options.title,
    confirmText: options.confirmText ?? (kind === "alert" ? "OK" : DEFAULTS.confirmText),
    cancelText: options.cancelText ?? DEFAULTS.cancelText,
    defaultValue: options.defaultValue ?? DEFAULTS.defaultValue,
    placeholder: options.placeholder ?? DEFAULTS.placeholder,
    inputType: options.inputType ?? DEFAULTS.inputType,
    validate: options.validate,
  };
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const nextId = useRef(0);

  const api = useMemo<DialogApi>(() => {
    const enqueue = (
      kind: DialogRequest["kind"],
      message: string,
      options: AlertOptions & Partial<PromptOptions> & Partial<ConfirmOptions>,
    ) =>
      new Promise<string | boolean | null>((resolve) => {
        nextId.current += 1;
        const request = toRequest(nextId.current, kind, message, options, resolve);
        setQueue((prev) => [...prev, request]);
      });

    return {
      alert: async (message, options) => {
        await enqueue("alert", message, options ?? {});
      },
      confirm: (message, options) => enqueue("confirm", message, options ?? {}) as Promise<boolean>,
      prompt: (message, options) =>
        enqueue("prompt", message, options ?? {}) as Promise<string | null>,
    };
  }, []);

  const current = queue[0] ?? null;

  const settle = useCallback(
    (value: string | boolean | null) => {
      current?.resolve(value);
      setQueue((prev) => prev.slice(1));
    },
    [current],
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogHost key={current.id} request={current} onSettle={settle} />}
    </DialogContext.Provider>
  );
}
