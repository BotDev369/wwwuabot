/**
 * Форма нової або зміненої групи. Живе окремо від списку: у згорнутому стані
 * вона не займає екран, а відкривається лише за дією.
 *
 * @module web-platform-dev/src/pages/analysis/GroupAdder
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";

interface GroupAdderProps {
  editing: boolean;
  name: string;
  canSave: boolean;
  onName: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function GroupAdder({
  editing,
  name,
  canSave,
  onName,
  onSave,
  onCancel,
}: GroupAdderProps): ReactElement {
  return (
    <div className="an-row an-adder">
      <div className="an-adder__head">
        <strong className="an-adder__title">{editing ? "Змінити групу" : "Нова група"}</strong>
        <button
          type="button"
          className="an-row-action"
          aria-label="Скасувати форму групи"
          title="Скасувати"
          onClick={onCancel}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      <label className="an-field">
        <span className="an-field__label">{editing ? "Нова назва групи" : "Назва групи"}</span>
        <input
          className="an-input"
          type="text"
          value={name}
          placeholder="Наприклад, команда"
          onChange={(event) => onName(event.target.value)}
        />
      </label>
      <button type="button" className="wb-btn wb-btn-primary" disabled={!canSave} onClick={onSave}>
        {editing ? "Зберегти групу" : "Створити групу"}
      </button>
      <p className="an-pick__hint">
        Група збирається з позначених людей і подій. Порожню групу не створюємо.
      </p>
    </div>
  );
}
