import type { KeyboardButtonModel, KeyboardRowModel } from "./types";
import { genId, newButton } from "./keyboard.utils";

interface Props {
  rows: KeyboardRowModel[];
  onChange: (rows: KeyboardRowModel[]) => void;
}

export function KeyboardEditor({ rows, onChange }: Props) {
  function updateRow(rowId: string, fn: (r: KeyboardRowModel) => KeyboardRowModel) {
    onChange(rows.map((r) => (r.id === rowId ? fn(r) : r)));
  }
  function moveRow(rowId: string, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === rowId);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next);
  }
  function removeRow(rowId: string) {
    onChange(rows.filter((r) => r.id !== rowId));
  }
  function addRow() {
    onChange([...rows, { id: genId(), buttons: [newButton()] }]);
  }
  function updateButton(rowId: string, btnId: string, patch: Partial<KeyboardButtonModel>) {
    updateRow(rowId, (r) => ({
      ...r,
      buttons: r.buttons.map((b) => (b.id === btnId ? { ...b, ...patch } : b)),
    }));
  }
  function removeButton(rowId: string, btnId: string) {
    updateRow(rowId, (r) => ({ ...r, buttons: r.buttons.filter((b) => b.id !== btnId) }));
  }
  function addButton(rowId: string) {
    updateRow(rowId, (r) => ({ ...r, buttons: [...r.buttons, newButton()] }));
  }

  return (
    <div className="kb-editor">
      {rows.length === 0 && <p className="kb-empty">Кнопок немає. Додай перший рядок.</p>}
      {rows.map((row, rIdx) => (
        <div className="kb-row" key={row.id}>
          <div className="kb-row-header">
            <span className="kb-row-label">Рядок {rIdx + 1}</span>
            <div className="kb-row-actions">
              <button
                type="button"
                className="block-action-btn"
                onClick={() => moveRow(row.id, -1)}
                disabled={rIdx === 0}
                title="Вгору"
              >
                ↑
              </button>
              <button
                type="button"
                className="block-action-btn"
                onClick={() => moveRow(row.id, 1)}
                disabled={rIdx === rows.length - 1}
                title="Вниз"
              >
                ↓
              </button>
              <button
                type="button"
                className="block-action-btn block-action-btn--danger"
                onClick={() => removeRow(row.id)}
                title="Видалити рядок"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="kb-row-buttons">
            {row.buttons.map((b) => (
              <div className="kb-btn" key={b.id}>
                <input
                  className="wb-input"
                  placeholder="Текст кнопки"
                  value={b.text}
                  onChange={(e) => updateButton(row.id, b.id, { text: e.target.value })}
                />
                <select
                  className="wb-select"
                  value={b.kind}
                  onChange={(e) =>
                    updateButton(row.id, b.id, {
                      kind: e.target.value as KeyboardButtonModel["kind"],
                    })
                  }
                >
                  <option value="callback">callback_data</option>
                  <option value="url">url</option>
                  <option value="web_app">вебапп</option>
                  <option value="none">без дії</option>
                </select>
                {b.kind !== "none" && (
                  <input
                    className="wb-input"
                    placeholder={
                      b.kind === "url"
                        ? "https://…"
                        : b.kind === "web_app"
                          ? "https://example.com/app"
                          : "codeword / @дія:ціль"
                    }
                    value={b.value}
                    onChange={(e) => updateButton(row.id, b.id, { value: e.target.value })}
                  />
                )}
                <button
                  type="button"
                  className="block-action-btn block-action-btn--danger"
                  onClick={() => removeButton(row.id, b.id)}
                  title="Видалити кнопку"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="kb-add-btn" onClick={() => addButton(row.id)}>
              + Кнопка
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="kb-add-row" onClick={addRow}>
        + Додати рядок
      </button>
    </div>
  );
}
