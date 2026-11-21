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

  return (
    <div className="an-person-line">
      <label className="an-person an-person--pick">
        <input
          type="checkbox"
          checked={picked}
          aria-label={`Обрати ${one.name || humanDate(one.date)}`}
          onChange={onToggle}
        />
        <span className="an-person__name">{one.name || "Без підпису"}</span>
        <span className="an-person__date">{humanDate(one.date)}</span>
      </label>

      <div className="an-tools">
        <button type="button" className="an-tool" onClick={onStartEdit}>
          <Icon name="settings" size={16} />
          Змінити
        </button>
        <button type="button" className="an-tool" onClick={onRemove}>
          <Icon name="close" size={16} />
          Видалити
        </button>
      </div>

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
    </div>
  );
}

interface PeopleAdderProps {
  kind: Kind;
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  onAdd: () => void;
}

export function PeopleAdder({ kind, draft, onDraft, onAdd }: PeopleAdderProps): ReactElement {
  return (
    <div className="an-row">
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
