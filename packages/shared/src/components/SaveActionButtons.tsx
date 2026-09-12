/**
 * SaveActionButtons — єдиний універсальний модуль дій збереження та закриття.
 *
 * Надає 3 обов'язкові дії:
 *  1. "Зберегти і закрити" — зберігає дані та закриває модальне вікно / форму.
 *  2. "Зберегти" (без закриття) — зберігає дані, показує індикатор успіху і залишає форму відкритою.
 *  3. "Закрити" (без зберігання) — закриває модальне вікно / повертається назад без збереження.
 */
import { type ReactElement, type CSSProperties } from "react";
import { icons, type IconName } from "./icons";

// ── Icon helper ───────────────────────────────────────────────────
const ico = (name: IconName, size = 16): ReactElement => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      flexShrink: 0,
    }}
  >
    {icons[name]}
  </span>
);

// ── Types ─────────────────────────────────────────────────────────
export type SavingActionType = "save" | "saveAndClose" | null;

export interface SaveActionButtonsProps {
  /** Викликається при виборі "Зберегти і закрити" */
  onSaveAndClose?: () => void | Promise<void>;

  /** Викликається при виборі "Зберегти" (без закриття) */
  onSave?: () => void | Promise<void>;

  /** Викликається при виборі "Закрити" (без зберігання) */
  onClose: () => void;

  /** Альтернативний універсальний обробник: onSaveWithClose(shouldClose: boolean) */
  onSaveWithClose?: (shouldClose: boolean) => void | Promise<void>;

  /** Чи триває зараз збереження */
  saving?: boolean;

  /** Яка конкретно дія зараз зберігається */
  savingAction?: SavingActionType;

  /** Чи завантажуються початкові дані форми / модалки */
  loading?: boolean;

  /** Чи заблоковані кнопки збереження */
  disabled?: boolean;

  /** Стан успіху після "Зберегти" (без закриття): показує "✓ Збережено" на кнопці */
  saved?: boolean;

  /** Повідомлення для кнопки збереження без закриття (за замовчуванням: "Збережено") */
  savedMessage?: string;

  /** Глобальний стан успіху (наприклад, анімація перед закриттям модалки) */
  success?: boolean;

  /** Текст глобального повідомлення успіху */
  successMessage?: string;

  /** Кастомний текст кнопки "Зберегти і закрити" */
  saveAndCloseLabel?: string;

  /** Кастомний текст кнопки "Зберегти" */
  saveLabel?: string;

  /** Кастомний текст кнопки "Закрити" */
  closeLabel?: string;

  /** Розмір кнопок: стандартний ('md') або компактний ('sm') */
  size?: "sm" | "md";

  /** Додаткові CSS-класи */
  className?: string;

  /** Інлайн-стилі контейнера */
  style?: CSSProperties;

  /** Приховати кнопку "Зберегти" (без закриття) */
  hideSave?: boolean;

  /** Приховати кнопку "Зберегти і закрити" */
  hideSaveAndClose?: boolean;

  /** Приховати кнопку "Закрити" */
  hideClose?: boolean;
}

// ── Component ─────────────────────────────────────────────────────
export function SaveActionButtons({
  onSaveAndClose,
  onSave,
  onClose,
  onSaveWithClose,
  saving = false,
  savingAction = null,
  loading = false,
  disabled = false,
  saved = false,
  savedMessage = "Збережено",
  success = false,
  successMessage = "✓ Збережено",
  saveAndCloseLabel = "Зберегти і закрити",
  saveLabel = "Зберегти",
  closeLabel = "Закрити",
  size = "md",
  className = "",
  style,
  hideSave = false,
  hideSaveAndClose = false,
  hideClose = false,
}: SaveActionButtonsProps): ReactElement {
  // Якщо весь блок у стані фінального успіху
  if (success) {
    return (
      <div className={`wb-save-actions wb-save-actions--success ${className}`.trim()} style={style}>
        <span
          className="usr-edit-success"
          style={{ fontWeight: 600, color: "var(--color-success, #22c55e)" }}
        >
          {successMessage}
        </span>
      </div>
    );
  }

  const isSaveAndCloseSaving = saving && savingAction === "saveAndClose";
  const isSaveSaving = saving && savingAction === "save";
  const anySaving = saving || loading;

  const handleSaveAndCloseClick = () => {
    if (anySaving || disabled) return;
    if (onSaveAndClose) {
      void onSaveAndClose();
    } else if (onSaveWithClose) {
      void onSaveWithClose(true);
    }
  };

  const handleSaveClick = () => {
    if (anySaving || disabled) return;
    if (onSave) {
      void onSave();
    } else if (onSaveWithClose) {
      void onSaveWithClose(false);
    }
  };

  const smClass = size === "sm" ? "wb-btn-sm" : "";

  return (
    <div
      className={`wb-save-actions ${className}`.trim()}
      style={style}
      data-testid="save-actions-module"
    >
      {/* 3. Закрити (без зберігання) */}
      {!hideClose && (
        <button
          type="button"
          className={`wb-btn wb-btn-secondary wb-save-actions-btn wb-save-actions-btn--close ${smClass}`.trim()}
          onClick={onClose}
          disabled={saving}
          title="Закрити без збереження"
          data-testid="btn-close"
        >
          {ico("close", size === "sm" ? 14 : 16)}
          <span>{closeLabel}</span>
        </button>
      )}

      {/* 2. Зберегти (без закриття) */}
      {!hideSave && (
        <button
          type="button"
          className={`wb-btn wb-btn-secondary wb-save-actions-btn wb-save-actions-btn--secondary ${saved ? "wb-save-actions-btn--saved" : ""} ${smClass}`.trim()}
          onClick={handleSaveClick}
          disabled={anySaving || disabled}
          title="Зберегти поточні зміни без закриття"
          data-testid="btn-save"
        >
          {isSaveSaving ? (
            <span>Збереження…</span>
          ) : saved ? (
            <>
              {ico("check", size === "sm" ? 14 : 16)}
              <span>{savedMessage}</span>
            </>
          ) : (
            <>
              {ico("save", size === "sm" ? 14 : 16)}
              <span>{saveLabel}</span>
            </>
          )}
        </button>
      )}

      {/* 1. Зберегти і закрити */}
      {!hideSaveAndClose && (
        <button
          type="button"
          className={`wb-btn wb-btn-primary wb-save-actions-btn wb-save-actions-btn--primary ${smClass}`.trim()}
          onClick={handleSaveAndCloseClick}
          disabled={anySaving || disabled}
          title="Зберегти всі зміни та закрити"
          data-testid="btn-save-and-close"
        >
          {isSaveAndCloseSaving ? (
            <span>Збереження…</span>
          ) : (
            <>
              {ico("save", size === "sm" ? 14 : 16)}
              <span>{saveAndCloseLabel}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
