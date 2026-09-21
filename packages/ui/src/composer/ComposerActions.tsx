import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";

/**
 * Кнопки композера — «Закрити» й «Зберегти».
 *
 * Винесені окремо, бо **однакові для всіх вкладок**: вкладка лише ставить їх
 * у свій розклад (останнім рядком тіла), а що саме зберігається — вирішує
 * композер за активною вкладкою. Друга копія цих кнопок у вкладці оголошень
 * розійшлася б із першою на першій же правці (AGENTS.md §3).
 */
export function ComposerActions({
  saving,
  disabled,
  editing,
  onClose,
  onSave,
}: {
  saving: boolean;
  /** Нема чого зберігати (порожня нотатка або оголошення) — кнопка вимкнена. */
  disabled: boolean;
  /** Правка існуючого запису: те саме слово, що в кнопки, змінює підпис. */
  editing: boolean;
  onClose: () => void;
  onSave: () => void;
}): ReactElement {
  return (
    <>
      <button type="button" className="wb-btn wb-btn-secondary" onClick={onClose}>
        Закрити
      </button>
      <button
        type="button"
        className="wb-btn wb-btn-primary"
        disabled={saving || disabled}
        onClick={onSave}
      >
        <Icon name="save" size={16} />
        {saving ? "Зберігаю…" : editing ? "Зберегти зміни" : "Зберегти"}
      </button>
    </>
  );
}
