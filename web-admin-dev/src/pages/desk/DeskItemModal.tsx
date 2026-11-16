/**
 * Справа — та сама модалка, що й звернення в «Повідомленнях»: шапка, стрічка
 * записів, композер у підвалі. Окремих `.desk-*` панелей немає.
 *
 * @module web-admin-dev/src/pages/desk/DeskItemModal
 */

import { useRef, useState } from "react";
import { icons } from "@wwwuabot/shared";
import labels from "./desk-labels.json";
import { statusTone, turnTone, type DeskEntryView, type DeskRoomView } from "./desk-view";

const STATUSES = labels.statuses as Record<string, string>;
const TURNS = labels.turns as Record<string, string>;
const AUTHORS = labels.authors as Record<string, string>;

interface DeskItemModalProps {
  item: DeskRoomView;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSend: (text: string, files: File[]) => void;
  onEditItem: () => void;
  onArchiveItem: () => void;
  onDeleteItem: () => void;
  onEditEntry: (entry: DeskEntryView) => void;
  onDeleteEntry: (id: number) => void;
  onDeleteFile: (id: number) => void;
}

export function DeskItemModal({
  item,
  busy,
  error,
  onClose,
  onSend,
  onEditItem,
  onArchiveItem,
  onDeleteItem,
  onEditEntry,
  onDeleteEntry,
  onDeleteFile,
}: DeskItemModalProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const { thread, entries, files: loose } = item;

  function send(): void {
    if (busy) return;
    if (!text.trim() && files.length === 0) return;
    onSend(text, files);
    setText("");
    setFiles([]);
  }

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(event) => event.stopPropagation()}>
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">{thread.title}</h3>
          <button className="wb-modal-close" onClick={onClose} aria-label={labels.close}>
            {icons["close"]}
          </button>
        </div>

        <div className="wb-modal-body">
          <div className="desk-item-tags">
            <span className={`wb-badge ${statusTone(thread.status)}`}>
              {STATUSES[thread.status] ?? thread.status}
            </span>
            <span className={`wb-badge ${turnTone(thread.turn)}`}>
              {TURNS[thread.turn] ?? thread.turn}
            </span>
            {thread.archived && (
              <span className="wb-badge wb-badge-neutral">{labels.archiveOnly}</span>
            )}
          </div>

          <div className="desk-item-actions">
            <button type="button" className="wb-btn wb-btn-ghost" onClick={onEditItem}>
              {labels.editItem}
            </button>
            <button type="button" className="wb-btn wb-btn-ghost" onClick={onArchiveItem}>
              {thread.archived ? labels.unarchiveItem : labels.archiveItem}
            </button>
            <button
              type="button"
              className="wb-btn wb-btn-ghost desk-danger"
              onClick={onDeleteItem}
            >
              {labels.deleteItem}
            </button>
          </div>

          {entries.length === 0 && loose.length === 0 && (
            <p className="desk-empty">{labels.feedEmpty}</p>
          )}

          {entries.map((entry) => (
            <article key={entry.id} className="desk-entry">
              <div className="desk-entry-head">
                <b className="desk-entry-author">{AUTHORS[entry.author] ?? entry.author}</b>
                <span className="desk-entry-when">{entry.when}</span>
                <span className="desk-entry-actions">
                  <button
                    type="button"
                    className="wb-btn wb-btn-ghost"
                    onClick={() => onEditEntry(entry)}
                    aria-label={labels.editEntry}
                  >
                    {icons["edit"]}
                  </button>
                  <button
                    type="button"
                    className="wb-btn wb-btn-ghost desk-danger"
                    onClick={() => onDeleteEntry(entry.id)}
                    aria-label={labels.deleteEntry}
                  >
                    {icons["trash"]}
                  </button>
                </span>
              </div>
              <p className="desk-entry-body">{entry.body}</p>
              {entry.files.length > 0 && (
                <div className="desk-files">
                  {entry.files.map((file) => (
                    <span key={file.id} className="desk-file">
                      <a
                        className="desk-file-name"
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {file.name}
                      </a>
                      <span className="desk-file-size">{file.size}</span>
                      <button
                        type="button"
                        className="desk-file-drop"
                        onClick={() => onDeleteFile(file.id)}
                        aria-label={`${labels.deleteFile}: ${file.name}`}
                      >
                        {icons["close"]}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}

          {loose.length > 0 && (
            <div className="desk-files">
              {loose.map((file) => (
                <span key={file.id} className="desk-file">
                  <a className="desk-file-name" href={file.url} target="_blank" rel="noreferrer">
                    {file.name}
                  </a>
                  <span className="desk-file-size">{file.size}</span>
                  <button
                    type="button"
                    className="desk-file-drop"
                    onClick={() => onDeleteFile(file.id)}
                    aria-label={`${labels.deleteFile}: ${file.name}`}
                  >
                    {icons["close"]}
                  </button>
                </span>
              ))}
            </div>
          )}

          {error && <p className="desk-error">{error}</p>}
        </div>

        <div className="wb-modal-footer desk-composer">
          <textarea
            className="wb-textarea"
            rows={3}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send();
            }}
            placeholder={labels.composerLabel}
            aria-label={labels.composerLabel}
          />
          {files.length > 0 && (
            <div className="desk-files">
              {files.map((file, index) => (
                <span key={`${file.name}-${index}`} className="desk-file">
                  <span className="desk-file-name">{file.name}</span>
                  <button
                    type="button"
                    className="desk-file-drop"
                    onClick={() => setFiles((current) => current.filter((_, at) => at !== index))}
                    aria-label={`${labels.removeFile}: ${file.name}`}
                  >
                    {icons["close"]}
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="desk-composer-row">
            <input
              ref={picker}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                const list = event.target.files;
                if (list) setFiles((current) => [...current, ...Array.from(list)]);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="wb-btn wb-btn-ghost"
              onClick={() => picker.current?.click()}
              aria-label={labels.attach}
            >
              {icons["paper"]}
            </button>
            <button type="button" className="wb-btn wb-btn-primary" onClick={send} disabled={busy}>
              {busy ? labels.uploading : labels.send}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
