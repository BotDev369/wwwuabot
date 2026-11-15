/**
 * Права колонка «Стола»: шапка теми, стрічка, композер.
 * Чернетка скидається сама через `key={thread.id}` у батька; файлів — скільки
 * завгодно, список не обрізається.
 *
 * @module web-admin-dev/src/pages/desk/DeskRoom
 */

import { useRef, useState } from "react";
import labels from "./desk-labels.json";
import { statusTone, turnTone, type DeskRoomView } from "./desk-view";

const STATUSES = labels.statuses as Record<string, string>;
const TURNS = labels.turns as Record<string, string>;
const KINDS = labels.kinds as Record<string, string>;
const AUTHORS = labels.authors as Record<string, string>;

interface DeskRoomProps {
  room: DeskRoomView;
  busy: boolean;
  onBack: () => void;
  onSend: (text: string, kind: string, files: File[]) => void;
  onPatchThread: (patch: Record<string, unknown>) => void;
  onDeleteEntry: (id: number) => void;
  onDeleteFile: (id: number) => void;
}

export function DeskRoom({
  room,
  busy,
  onBack,
  onSend,
  onPatchThread,
  onDeleteEntry,
  onDeleteFile,
}: DeskRoomProps) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState("note");
  const [files, setFiles] = useState<File[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const { thread, entries, files: looseFiles } = room;

  function addFiles(list: FileList | null): void {
    if (!list || list.length === 0) return;
    setFiles((current) => [...current, ...Array.from(list)]);
  }

  function send(): void {
    if (busy) return;
    if (!text.trim() && files.length === 0) return;
    onSend(text, kind, files);
    setText("");
    setFiles([]);
  }

  return (
    <div className="desk-room">
      <header className="desk-room-head">
        <button type="button" className="desk-room-back" onClick={onBack}>
          {labels.back}
        </button>
        <span className="desk-room-path">{thread.subgroup || labels.allThreads}</span>
        <h1 className="desk-room-title">{thread.title}</h1>
        <span className="desk-room-tags">
          <span className={`wb-badge ${statusTone(thread.status)}`}>
            {STATUSES[thread.status] ?? thread.status}
          </span>
          <span className={`wb-badge ${turnTone(thread.turn)}`}>
            {TURNS[thread.turn] ?? thread.turn}
          </span>
          {thread.tags.map((tag) => (
            <span key={tag} className="desk-tag">
              {tag}
            </span>
          ))}
        </span>
        <span className="desk-room-controls">
          <label className="desk-control">
            <span>{labels.statusLabel}</span>
            <select
              value={thread.status}
              onChange={(event) => onPatchThread({ status: event.target.value })}
              aria-label={labels.statusLabel}
            >
              {Object.entries(STATUSES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="desk-control">
            <span>{labels.turnLabel}</span>
            <select
              value={thread.turn}
              onChange={(event) => onPatchThread({ turn: event.target.value })}
              aria-label={labels.turnLabel}
            >
              {Object.entries(TURNS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </span>
      </header>

      <div className="desk-feed">
        {entries.length === 0 && <p className="desk-empty">{labels.feedEmpty}</p>}
        {entries.map((entry) => (
          <article key={entry.id} className={`desk-entry desk-entry--${entry.author}`}>
            <div className="desk-entry-head">
              <b className="desk-entry-author">{AUTHORS[entry.author] ?? entry.author}</b>
              <span className="desk-entry-kind">{KINDS[entry.kind] ?? entry.kind}</span>
              <span className="desk-entry-when">{entry.when}</span>
              <button
                type="button"
                className="desk-entry-drop"
                onClick={() => onDeleteEntry(entry.id)}
                title={labels.deleteEntry}
                aria-label={labels.deleteEntry}
              >
                ×
              </button>
            </div>
            <p className="desk-entry-body">{entry.body}</p>
            {entry.files.length > 0 && (
              <div className="desk-files">
                {entry.files.map((file) => (
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
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {looseFiles.length > 0 && (
        <div className="desk-loose">
          <span className="desk-loose-title">{labels.filesTitle}</span>
          <div className="desk-files">
            {looseFiles.map((file) => (
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
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="desk-composer">
        <textarea
          className="desk-composer-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send();
          }}
          placeholder={labels.composerPlaceholder}
          aria-label={labels.composerPlaceholder}
        />
        {files.length > 0 && (
          <div className="desk-composer-files">
            {files.map((file, index) => (
              <span key={`${file.name}-${index}`} className="desk-file-chip">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((_, at) => at !== index))}
                  aria-label={`${labels.removeFile}: ${file.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="desk-composer-row">
          <div className="desk-composer-tools">
            <select
              className="desk-composer-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              aria-label={labels.kindLabel}
            >
              {Object.entries(KINDS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
            <input
              ref={picker}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="wb-btn wb-btn-ghost wb-btn-sm"
              onClick={() => picker.current?.click()}
              onDragOver={(event) => event.preventDefault()}
            >
              {labels.attach}
            </button>
            <span className="desk-hint">{busy ? labels.uploading : labels.composerHint}</span>
          </div>
          <button type="button" className="wb-btn wb-btn-primary" onClick={send} disabled={busy}>
            {labels.send}
          </button>
        </div>
      </div>
    </div>
  );
}
