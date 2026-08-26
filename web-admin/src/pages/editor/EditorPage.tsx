import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../../features/editor/store";
import { blockRegistry } from "../../features/editor/blocks/registry";
import type { BaseBlock } from "../../features/editor/blocks/types";
import { PageTopbar } from "../../layout/PageTopbar";
import { useSearchParams } from "react-router-dom";
import { RichBlocksView } from "../../features/editor/blocks/RichBlocksView";

// ─── Block Picker (Бере дані з Реєстру!) ─────────────────────────────────────
function BlockPicker({ onPick, onClose }: { onPick: (t: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="block-picker" ref={ref}>
      {blockRegistry.getAllConfigs().map(({ type, label, icon }) => (
        <button
          key={type}
          className="block-picker-item"
          onClick={() => {
            onPick(type);
            onClose();
          }}
        >
          <span className="block-picker-icon">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Універсальна картка блоку (Магія Реєстру!) ──────────────────────────────
function BlockCard({ block, idx, total }: { block: BaseBlock; idx: number; total: number }) {
  const config = blockRegistry.getByInternalType(block.type);
  if (!config) return null;
  const EditorComponent = config.Editor;
  return <EditorComponent key={block.id} block={block as never} idx={idx} total={total} />;
}

// ─── Telegram Preview (Також через Реєстр!) ──────────────────────────────────
function TgPreview({ blocks }: { blocks: BaseBlock[] }) {
  if (blocks.length === 0) {
    return (
      <div className="tg-preview">
        <div className="tg-message">
          <div className="tg-message-placeholder">Тут буде превʼю повідомлення</div>
        </div>
      </div>
    );
  }
  return (
    <div className="tg-preview">
      <div className="tg-message">
        <RichBlocksView blocks={blocks} />
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge() {
  const { status, errorMsg } = useEditorStore();
  if (status === "idle") return null;
  if (status === "loading")
    return <span className="status-badge status-badge--loading">Завантаження…</span>;
  if (status === "saving")
    return <span className="status-badge status-badge--saving">Збереження…</span>;
  if (status === "saved")
    return <span className="status-badge status-badge--saved">✓ Збережено</span>;
  if (status === "error")
    return (
      <span className="status-badge status-badge--error" title={errorMsg ?? ""}>
        Помилка
      </span>
    );
  return null;
}

// ─── Editor Page ──────────────────────────────────────────────────────────────
export function EditorPage() {
  const { codeword, setCodeword, blocks, addBlock, status, isDirty, load, save } = useEditorStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchParams] = useSearchParams();

  // Клік по рядку у списку приводить на /editor?cw=<codeword>:
  // підставляємо codeword і одразу завантажуємо сценарій.
  useEffect(() => {
    const cw = searchParams.get("cw");
    if (cw) {
      setCodeword(cw);
      void load();
    }
  }, [searchParams, setCodeword, load]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") load();
  }

  return (
    <>
      <PageTopbar>
        <div className="topbar-left">
          <h1 className="topbar-title">RichMessage Editor</h1>
          <StatusBadge />
        </div>
        <div className="topbar-right">
          <div className="codeword-input-wrap">
            <span className="codeword-prefix">#</span>
            <input
              type="text"
              className="codeword-input"
              placeholder="codeword"
              value={codeword}
              onChange={(e) => setCodeword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            className="btn btn--secondary"
            onClick={load}
            disabled={!codeword.trim() || status === "loading"}
          >
            Завантажити
          </button>
          <button
            className={`btn btn--primary${isDirty ? " btn--dirty" : ""}`}
            onClick={save}
            disabled={!codeword.trim() || status === "saving"}
          >
            Зберегти
          </button>
        </div>
      </PageTopbar>

      <div className="workspace">
        <div className="editor-panel">
          <div className="panel-header">
            <span className="panel-title">Блоки</span>
            <div style={{ position: "relative" }}>
              <button className="add-block-btn" onClick={() => setPickerOpen((v) => !v)}>
                + Додати блок
              </button>
              {pickerOpen && (
                <BlockPicker onPick={(t) => addBlock(t)} onClose={() => setPickerOpen(false)} />
              )}
            </div>
          </div>
          <div className="blocks-list">
            {blocks.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text">
                  Введіть codeword і натисніть «Завантажити»,
                  <br />
                  або натисніть «+ Додати блок».
                </p>
              </div>
            ) : (
              <div className="blocks-stack">
                {blocks.map((block, idx) => (
                  <BlockCard key={block.id} block={block} idx={idx} total={blocks.length} />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="preview-panel">
          <div className="panel-header">
            <span className="panel-title">Preview</span>
            <span className="preview-badge">Telegram</span>
          </div>
          <TgPreview blocks={blocks} />
        </div>
      </div>
    </>
  );
}
