/**
 * DateModal — модалка створення/редагування/перегляду дати.
 */

import { useState } from "react";
import type { MyDate, ModalMode } from "./types";
import { getTagColor } from "./constants";

interface DateModalProps {
  mode: ModalMode;
  date: MyDate | null;
  allTags: string[];
  onClose: () => void;
  onSave: (data: Partial<MyDate>) => void;
  onDelete?: (id: string) => void;
}

export function DateModal({ mode, date, allTags, onClose, onSave, onDelete }: DateModalProps) {
  const [name, setName] = useState(date?.name ?? "");
  const [dateVal, setDateVal] = useState(date?.date ?? "");
  const [type, setType] = useState(date?.type ?? "person");
  const [tags, setTags] = useState<string[]>(date?.tags ?? []);
  const [notes, setNotes] = useState(date?.notes ?? "");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const isReadonly = mode === "view";

  const handleSave = async () => {
    if (!dateVal) return;
    setSaving(true);
    try {
      await onSave({ id: date?.id, name, date: dateVal, type, tags, notes });
    } finally {
      setSaving(false);
    }
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {mode === "create" && "Нова дата"}
            {mode === "edit" && "Редагувати дату"}
            {mode === "view" && "Перегляд дати"}
          </h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Назва</label>
            <input
              className="wb-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ім'я або назва"
              disabled={isReadonly}
            />
          </div>
          <div className="form-group">
            <label>Дата *</label>
            <input
              type="date"
              className="wb-input"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              disabled={isReadonly}
              required
            />
          </div>
          <div className="form-group">
            <label>Тип</label>
            <select
              className="wb-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={isReadonly}
            >
              <option value="person">Людина</option>
              <option value="event">Подія</option>
              <option value="other">Інше</option>
            </select>
          </div>
          <div className="form-group">
            <label>Теги</label>
            <div className="tags-input">
              {tags.map((t) => (
                <span key={t} className="tag-chip" style={getTagColor(t)}>
                  {t}
                  {!isReadonly && (
                    <button className="tag-remove" onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>
                      ✕
                    </button>
                  )}
                </span>
              ))}
              {!isReadonly && (
                <input
                  className="wb-input tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Додати тег..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }
                  }}
                  onBlur={() => tagInput && addTag(tagInput)}
                />
              )}
            </div>
            {!isReadonly && allTags.length > 0 && (
              <div className="tag-suggestions">
                {allTags.filter((t) => !tags.includes(t)).slice(0, 8).map((t) => (
                  <button key={t} className="tag-chip tag-chip--sm" style={getTagColor(t)} onClick={() => addTag(t)}>
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Примітки</label>
            <textarea
              className="wb-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isReadonly}
            />
          </div>
        </div>
        <div className="modal-actions">
          {mode === "edit" && date && onDelete && (
            <button
              className="wb-btn wb-btn-danger"
              onClick={() => { if (confirm("Видалити цю дату?")) onDelete(date.id); }}
            >
              Видалити
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="wb-btn wb-btn-secondary" onClick={onClose}>
            {isReadonly ? "Закрити" : "Скасувати"}
          </button>
          {!isReadonly && (
            <button className="wb-btn wb-btn-primary" onClick={handleSave} disabled={saving || !dateVal}>
              {saving ? "Зберігаємо..." : "Зберегти"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
