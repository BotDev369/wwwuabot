/**
 * Вкладка «Нотатка» — типова вкладка композера.
 *
 * Поле вводу, вставка з буфера й місце під вкладення. Саме додавання фото,
 * відео й файлів — окрема тема: тут лише кнопки, які чесно кажуть, що вона
 * ще не зроблена (заглушку показує композер через `useDialog`).
 *
 * @module @wwwuabot/ui/composer
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { AttachmentKind, ComposerNoteTabProps } from "./types";

/** Кнопки-вкладення: іконка, підпис і вид, який вони обіцяють. */
const ATTACHMENTS: readonly {
  kind: AttachmentKind;
  label: string;
  icon: "image" | "video" | "upload";
}[] = [
  { kind: "photo", label: "Фото", icon: "image" },
  { kind: "video", label: "Відео", icon: "video" },
  { kind: "file", label: "Файл", icon: "upload" },
];

export function ComposerNoteTab({
  note,
  onNoteChange,
  onPaste,
  onAttach,
  error,
}: ComposerNoteTabProps): ReactElement {
  return (
    <div className="wb-composer-pane">
      <textarea
        className="wb-textarea wb-composer-input"
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="Почніть писати…"
        aria-label="Текст нотатки"
      />

      {/* Підписам тут тісно: поле вводу — головне, тож кнопки лишаються самими
          іконками, а ім'я дії їде в `aria-label` і `title`. */}
      <div className="wb-composer-tools">
        {/* Вставка — єдина дія, яка вже працює: решта вкладень окремою темою */}
        <button
          type="button"
          className="wb-chip wb-composer-tool"
          aria-label="Вставити"
          title="Вставити"
          onClick={onPaste}
        >
          <Icon name="clipboard" size={18} />
        </button>
        {ATTACHMENTS.map((item) => (
          <button
            key={item.kind}
            type="button"
            className="wb-chip wb-composer-tool"
            aria-label={item.label}
            title={item.label}
            onClick={() => onAttach(item.kind)}
          >
            <Icon name={item.icon} size={18} />
          </button>
        ))}
      </div>

      {error && (
        <p className="wb-composer-error" role="alert">
          {error}
        </p>
      )}

      <p className="wb-composer-hint">
        До нотатки можна буде додати фото, відео й будь-що інше — це окрема тема, поки лише поле для
        тексту.
      </p>
    </div>
  );
}
