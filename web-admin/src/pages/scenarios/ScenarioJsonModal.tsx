import { useEffect, useState, useRef, useCallback } from "react";
import {
  readScenarioAll,
  updateScenarioFields,
} from "../../shared/api/scenarios.api";

interface Props {
  codeword: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * JSON-редактор сценарію.
 *
 * Дозволяє:
 * 1. Побачити всі поля сценарію як один JSON-об'єкт
 * 2. Скопіювати JSON в буфер обміну
 * 3. Вставити JSON з буферу обміну
 * 4. Зберегти зміни (оновлює всі передані поля)
 *
 * Підтримує page_data (колонка створюється автоматично при збереженні).
 */
export function ScenarioJsonModal({ codeword, onClose, onSaved }: Props) {
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Завантаження даних
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await readScenarioAll(codeword);
        if (!cancelled && row) {
          // Форматуємо JSON з відступами для зручності
          setJsonText(JSON.stringify(row, null, 2));
          setLoading(false);
        } else if (!cancelled) {
          setError("Сценарій не знайдено");
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [codeword]);

  // Закриття по Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Валідація JSON при зміні
  const handleJsonChange = useCallback((value: string) => {
    setJsonText(value);
    setValidationError(null);
    setSuccess(false);

    if (value.trim() === "") {
      setValidationError("JSON не може бути порожнім");
      return;
    }

    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setValidationError("JSON має бути об'єктом, не масивом або примітивом");
        return;
      }
      if (!parsed.codeword) {
        setValidationError("JSON повинен містити поле 'codeword'");
        return;
      }
    } catch {
      setValidationError("Невалідний JSON");
    }
  }, []);

  // Копіювання в буфер обміну
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: виділити текст
      if (textareaRef.current) {
        textareaRef.current.select();
      }
    }
  }, [jsonText]);

  // Вставка з буферу обміну
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      handleJsonChange(text);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch {
      // Кліпборд недоступний — користувач може вставити вручну
    }
  }, [handleJsonChange]);

  // Збереження
  const handleSave = useCallback(async () => {
    if (!jsonText.trim()) return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setValidationError("Невалідний JSON — не збережено");
      return;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setValidationError("JSON має бути об'єктом");
      return;
    }

    setSaving(true);
    setError(null);
    setValidationError(null);

    try {
      // Відправляємо всі поля окрім захищених
      await updateScenarioFields(codeword, parsed);
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [codeword, jsonText, onSaved, onClose]);

  // Форматувати JSON
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setValidationError(null);
    } catch {
      // Якщо JSON невалідний — не форматуємо
    }
  }, [jsonText]);

  // Очистити (секційно)
  const handleClearNonEssential = useCallback(async () => {
    try {
      const row = await readScenarioAll(codeword);
      if (!row) return;
      // Залишаємо тільки основні поля
      const essential: Record<string, unknown> = {
        codeword: row.codeword,
        title: (row as Record<string, unknown>).title ?? null,
        photo_url: (row as Record<string, unknown>).photo_url ?? null,
        caption_top: (row as Record<string, unknown>).caption_top ?? null,
        caption_mid: (row as Record<string, unknown>).caption_mid ?? null,
        caption_bot: (row as Record<string, unknown>).caption_bot ?? null,
        keyboard_type: (row as Record<string, unknown>).keyboard_type ?? null,
        buttons: (row as Record<string, unknown>).buttons ?? null,
        page_data: (row as Record<string, unknown>).page_data ?? null,
      };
      setJsonText(JSON.stringify(essential, null, 2));
      handleJsonChange(JSON.stringify(essential, null, 2));
    } catch {
      // ignore
    }
  }, [codeword, handleJsonChange]);

  return (
    <div className="usr-modal-overlay" onClick={onClose}>
      <div
        className="usr-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 800 }}
      >
        <div className="usr-modal-header">
          <span className="usr-modal-title">🔧 JSON: {codeword}</span>
          <button className="usr-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="usr-modal-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="usr-modal-loading">Завантаження…</div>
          ) : error && !jsonText ? (
            <div className="usr-modal-error">{error}</div>
          ) : (
            <div style={{ position: "relative" }}>
              {/* Панель інструментів */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border)",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn btn--secondary"
                  onClick={handleCopy}
                  style={{ fontSize: 12, padding: "4px 10px" }}
                >
                  {copied ? "✓ Скопійовано" : "📋 Копіювати JSON"}
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={handlePaste}
                  style={{ fontSize: 12, padding: "4px 10px" }}
                >
                  📥 Вставити з буферу
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={handleFormat}
                  style={{ fontSize: 12, padding: "4px 10px" }}
                >
                  ✨ Форматувати
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={handleClearNonEssential}
                  style={{ fontSize: 12, padding: "4px 10px" }}
                >
                  🧹 Очистити зайве
                </button>
              </div>

              {/* JSON textarea */}
              <textarea
                ref={textareaRef}
                className="json-editor-textarea"
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%",
                  minHeight: 400,
                  padding: "12px 16px",
                  border: "none",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "monospace",
                  fontSize: 13,
                  lineHeight: 1.5,
                  background: "var(--bg-secondary, #1e1e1e)",
                  color: "var(--text-primary, #d4d4d4)",
                  tabSize: 2,
                }}
              />

              {/* Статус-бар */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 12px",
                  borderTop: "1px solid var(--border)",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                <div>
                  {validationError ? (
                    <span style={{ color: "var(--color-error, #ef4444)" }}>
                      ⚠️ {validationError}
                    </span>
                  ) : jsonText.trim() ? (
                    <span style={{ color: "var(--color-success, #22c55e)" }}>
                      ✓ Валідний JSON
                    </span>
                  ) : null}
                </div>
                <div>
                  {jsonText.length.toLocaleString()} символів
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="usr-modal-footer">
          {success ? (
            <span className="usr-edit-success">✓ Збережено</span>
          ) : (
            <>
              <button
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saving || loading || !!validationError || !jsonText.trim()}
              >
                {saving ? "Збереження…" : "💾 Зберегти JSON"}
              </button>
              <button className="btn btn--secondary" onClick={onClose}>
                Скасувати
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
