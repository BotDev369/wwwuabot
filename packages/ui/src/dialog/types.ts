/**
 * Типи спільного діалогу (alert / confirm / prompt).
 *
 * Навіщо він існує: у Telegram Mini App нативні `window.alert`, `confirm` і
 * `prompt` не працюють — iOS WebView не має для них нативної в'юхи, тож
 * `prompt` повертає `null`, `confirm` — `false`, а `alert` не показується
 * взагалі. Кнопка «Додати сторінку» просто нічого не робила на телефоні.
 *
 * @module @wwwuabot/ui/dialog
 */

/** Тон діалогу — впливає лише на вигляд кнопки підтвердження. */
export type DialogTone = "neutral" | "danger";

export interface AlertOptions {
  title?: string;
  tone?: DialogTone;
  confirmText?: string;
}

export interface ConfirmOptions extends AlertOptions {
  cancelText?: string;
}

export interface PromptOptions extends AlertOptions {
  /** Початкове значення в полі вводу. */
  defaultValue?: string;
  placeholder?: string;
  inputType?: "text" | "url" | "date";
  /** Повертає текст помилки, якщо значення невалідне, інакше `null`. */
  validate?: (value: string) => string | null;
}

/**
 * Те, що бачить застосунок.
 *
 * `alert` не повертає значення, `confirm` — `true`/`false`,
 * `prompt` — введений рядок або `null`, якщо користувач скасував.
 */
export interface DialogApi {
  alert(message: string, options?: AlertOptions): Promise<void>;
  confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
  prompt(message: string, options?: PromptOptions): Promise<string | null>;
}

/** Внутрішній запит: те, що малює `DialogHost`. */
export interface DialogRequest {
  id: number;
  kind: "alert" | "confirm" | "prompt";
  message: string;
  title?: string;
  tone: DialogTone;
  confirmText: string;
  cancelText: string;
  defaultValue: string;
  placeholder: string;
  inputType: "text" | "url" | "date";
  validate?: (value: string) => string | null;
  resolve: (value: string | boolean | null) => void;
}
