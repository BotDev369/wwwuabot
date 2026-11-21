/**
 * Рядок людини або події та форма додавання: розмітка без стану, щоб екран
 * «Люди і події» лишався списком, а не монолітом.
 *
 * @module web-platform-dev/src/pages/analysis/PeopleRow
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import { isValidDate } from "@wwwuabot/shared/utils/mydate-helpers";
import { EntityRow, RowAction } from "./EntityRow";
import { humanDate, kindOf, type Draft, type Kind } from "./people-model";

interface PeopleRowProps {
  one: MyDate;
  picked: boolean;
  editing: boolean;
  draft: Draft;
  onToggle: () => void;
  onStartEdit: () => void;
  onDraft: (patch: Partial<Draft>) => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

export function PeopleRow({
  one,
  picked,
  editing,
  draft,
  onToggle,
  onStartEdit,
  onDraft,
  onSave,
  onCancel,
  onRemove,
}: PeopleRowProps): ReactElement {
  const kind = kindOf(one);
  const label = one.name || humanDate(one.date);

  return (
    <EntityRow
      name={one.name || "Без підпису"}
      meta={humanDate(one.date)}
      picked={picked}
      checkLabel={`Обрати ${label}`}
      onToggle={onToggle}
      actions={
        <>
          <RowAction label={`Змінити ${label}`} icon="edit" onClick={onStartEdit} />
          <RowAction label={`Видалити ${label}`} icon="trash" onClick={onRemove} danger />
        </>
      }
    >
      {editing && (
        <div className="an-pick">
          <label className="an-field">
            <span className="an-field__label">
              {kind === "event" ? "Дата події" : "Дата народження"}
            </span>
            <input
              className="an-date"
              type="date"
              value={draft.date}
              max="2100-12-31"
              onChange={(event) => onDraft({ date: event.target.value })}
            />
          </label>
          <label className="an-field">
            <span className="an-field__label">Підпис</span>
            <input
              className="an-input"
              type="text"
              value={draft.name}
              onChange={(event) => onDraft({ name: event.target.value })}
            />
          </label>
          <div className="an-tools">
            <button type="button" className="wb-btn wb-btn-primary" onClick={onSave}>
              Зберегти зміни
            </button>
            <button type="button" className="an-tool" onClick={onCancel}>
              Скасувати
            </button>
          </div>
        </div>
      )}
    </EntityRow>
  );
}

interface PeopleAdderProps {
  kind: Kind;
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  onAdd: () => void;
  onCancel: () => void;
}

export function PeopleAdder({
  kind,
  draft,
  onDraft,
  onAdd,
  onCancel,
}: PeopleAdderProps): ReactElement {
  return (
    <div className="an-row an-adder">
      <div className="an-adder__head">
        <strong className="an-adder__title">
          {kind === "event" ? "Нова подія" : "Нова людина"}
        </strong>
        <button
          type="button"
          className="an-row-action"
          aria-label="Скасувати додавання"
          title="Скасувати"
          onClick={onCancel}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      <label className="an-field">
        <span className="an-field__label">
          {kind === "event" ? "Дата події" : "Дата народження"}
        </span>
        <input
          className="an-date"
          type="date"
          value={draft.date}
          max="2100-12-31"
          onChange={(event) => onDraft({ date: event.target.value })}
        />
      </label>
      <label className="an-field">
        <span className="an-field__label">Підпис</span>
        <input
          className="an-input"
          type="text"
          value={draft.name}
          placeholder={kind === "event" ? "Наприклад, запуск" : "За бажанням"}
          onChange={(event) => onDraft({ name: event.target.value })}
        />
      </label>
      <button
        type="button"
        className="wb-btn wb-btn-primary"
        disabled={!isValidDate(draft.date)}
        onClick={onAdd}
      >
        {kind === "event" ? "Додати подію" : "Додати людину"}
      </button>
    </div>
  );
}
