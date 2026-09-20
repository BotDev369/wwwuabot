import type { ReactNode } from "react";
import { formatPlatformUsername } from "../../user/platform-username";
import { ico } from "./badges";
import { useHandleEdit } from "./useHandleEdit";

/**
 * Ім'я на платформі — **найперший** блок профілю.
 *
 * Це не Telegram-юзернейм і не «ще одне поле»: Telegram `username` може бути
 * відсутнім або змінитись, і тоді в продукті немає за що зачепитись. Тому в
 * людини є власне ім'я на wwwuabot, яке вона ставить сама, — і саме його
 * платформа вживає всюди.
 *
 * Без `onSubmit` блок лишається **читанням** (так його бачить адмінка): та
 * сама деталь, той самий вигляд, але чуже ім'я адмін не переписує випадково —
 * і ради йому не показують: «так вас бачать інші» стосується того, чиє це ім'я.
 *
 * **`avatar`** віддає місце круга тому, хто знає, чи є фото (сторінка акаунта).
 * Тоді порада й фото стоять в **одній** картці — бо фото показують іншим так
 * само, як ім'я, і два блоки з одним підписом читались би як дві речі.
 */
export function PlatformHandle({
  value,
  avatar,
  onSubmit,
}: {
  value: string | null | undefined;
  /** Круг у шапці блоку замість знака: `AccountAvatar` на сторінці акаунта. */
  avatar?: ReactNode;
  onSubmit?: (value: string) => Promise<string | null>;
}) {
  const formatted = formatPlatformUsername(value);
  const canEdit = Boolean(onSubmit);
  const edit = useHandleEdit(value, onSubmit);

  return (
    <div className="wb-profile wb-profile--handle">
      <div className="wb-handle-head">
        {avatar ?? <span className="wb-handle-badge">{ico("user", 18)}</span>}
        <div className="wb-handle-info">
          <div className="wb-handle-label">Ім'я на платформі</div>
          <div className={`wb-handle-name${formatted ? "" : " wb-handle-name--empty"}`}>
            {formatted ?? "ще не задано"}
          </div>
        </div>
        {canEdit && !edit.editing && (
          <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={edit.open}>
            {ico("edit", 14)} {formatted ? "Змінити" : "Обрати"}
          </button>
        )}
      </div>

      {edit.editing ? (
        <div className="wb-handle-form">
          <div className="wb-handle-input-row">
            <span className="wb-handle-sign">#</span>
            <input
              className="wb-handle-input"
              value={edit.value}
              maxLength={edit.maxLength}
              placeholder="наприклад, serhii"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Ім'я на платформі"
              onChange={(e) => edit.setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void edit.save();
                if (e.key === "Escape") edit.cancel();
              }}
            />
          </div>
          {edit.error && (
            <div className="wb-handle-error">
              {ico("warning", 14)} <span>{edit.error}</span>
            </div>
          )}
          <div className="wb-handle-actions">
            <button
              className="wb-btn wb-btn-primary wb-btn-sm"
              disabled={edit.saving}
              onClick={() => void edit.save()}
            >
              {edit.saving ? "Зберігаємо…" : "Зберегти"}
            </button>
            <button
              className="wb-btn wb-btn-secondary wb-btn-sm"
              disabled={edit.saving}
              onClick={edit.cancel}
            >
              Скасувати
            </button>
          </div>
        </div>
      ) : (
        // Порада — **тільки тому, чиє це ім'я**: у адмінки чуже ім'я стоїть для
        // читання, і «вас» там означало б не того, кого видно в рядку. Стосується
        // вона не лише імені: у тій самій картці стоїть і фото, а його інші
        // бачать так само.
        canEdit && <p className="wb-handle-hint">Так вас бачать інші.</p>
      )}
    </div>
  );
}
