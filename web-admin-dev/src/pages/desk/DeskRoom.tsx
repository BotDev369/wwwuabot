/**
 * Тема: шапка, стрічка, композер. Власні класи лише для розкладки столу,
 * поля й кнопки — спільні `wb-*`.
 *
 * @module web-admin-dev/src/pages/desk/DeskRoom
 */

import { useRef, useState } from "react";
import { icons } from "@wwwuabot/shared";
import labels from "./desk-labels.json";
import { statusTone, turnTone, type DeskEntryView, type DeskRoomView } from "./desk-view";

const STATUSES = labels.statuses as Record<string, string>;
const TURNS = labels.turns as Record<string, string>;
const KINDS = labels.kinds as Record<string, string>;
const AUTHORS = labels.authors as Record<string, string>;
const GROUP_LABELS = new Map(labels.groups.map((item) => [item.key, item.label]));

interface DeskRoomProps {
  room: DeskRoomView;
  busy: boolean;
  onBack: () => void;
  onSend: (text: string, kind: string, files: File[]) => void;
  onEditThread: () => void;
  onArchiveThread: () => void;
  onDeleteThread: () => void;
  onEditEntry: (entry: DeskEntryView) => void;
  onDeleteEntry: (id: number) => void;
  onDeleteFile: (id: number) => void;
}

export function DeskRoom({
  room,
  busy,
  onBack,
  onSend,
  onEditThread,
  onArchiveThread,
  onDeleteThread,
  onEditEntry,
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
        <div className="desk-room-bar">
          <button type="button" className="wb-btn wb-btn-ghost wb-btn-sm" onClick={onBack}>
            {labels.back}
          </button>
          <span className="desk-room-path">
            {thread.subgroup || GROUP_LABELS.get(thread.group) || thread.group}
          </span>
        </div>
        <h1 className="desk-room-title">{thread.title}</h1>
        <div className="desk-room-tags">
          <span className={`wb-badge ${statusTone(thread.status)}`}>
            {STATUSES[thread.status] ?? thread.status}
          </span>
          <span className={`wb-badge ${turnTone(thread.turn)}`}>
            {TURNS[thread.turn] ?? thread.turn}
          </span>
          {thread.archived && <span className="wb-badge wb-badge-neutral">{labels.archive}</span>}
          {thread.tags.map((tag) => (
            <span key={tag} className="wb-chip desk-tag">
              {tag}
            </span>
          ))}
        </div>
        <div className="desk-room-actions">
          <button
            type="button"
            className="wb-btn wb-btn-ghost wb-btn-sm"
            onClick={onEditThread}
            aria-label={labels.editThreadAria}
          >
            {labels.editThread}
          </button>
          <button
            type="button"
            className="wb-btn wb-btn-ghost wb-btn-sm"
            onClick={onArchiveThread}
            aria-label={thread.archived ? labels.unarchiveThreadAria : labels.archiveThreadAria}
          >
            {thread.archived ? labels.unarchiveThread : labels.archiveThread}
          </button>
          <button
            type="button"
            className="wb-btn wb-btn-ghost wb-btn-sm desk-danger"
            onClick={onDeleteThread}
            aria-label={labels.deleteThreadAria}
          >
            {labels.deleteThread}
          </button>
        </div>
      </header>

      <div className="desk-feed">
        {entries.length === 0 && <p className="desk-empty">{labels.feedEmpty}</p>}
        {entries.map((entry) => (
          <article key={entry.id} className={`desk-entry desk-entry--${entry.author}`}>
            <div className="desk-entry-head">
              <b className="desk-entry-author">{AUTHORS[entry.author] ?? entry.author}</b>
              <span className="wb-badge wb-badge-neutral">{KINDS[entry.kind] ?? entry.kind}</span>
              <span className="desk-entry-when">{entry.when}</span>
              <span className="desk-entry-actions">
                <button
                  type="button"
                  className="wb-btn wb-btn-ghost wb-btn-sm"
                  onClick={() => onEditEntry(entry)}
                  aria-label={labels.editEntryAria}
                >
                  {labels.editEntry}
                </button>
                <button
                  type="button"
                  className="wb-btn wb-btn-ghost wb-btn-sm desk-danger"
                  onClick={() => onDeleteEntry(entry.id)}
                  aria-label={labels.deleteEntryAria}
                >
                  {labels.delete}
                </button>
              </span>
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
          className="wb-textarea desk-composer-input"
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
              className="wb-select"
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
              aria-label={labels.attach}
            >
              <span className="desk-attach-icon">{icons["paper"]}</span>
              <span className="desk-attach-text">{labels.attach}</span>
            </button>
          </div>
          <button type="button" className="wb-btn wb-btn-primary" onClick={send} disabled={busy}>
            {labels.send}
          </button>
        </div>
      </div>
    </div>
  );
}
