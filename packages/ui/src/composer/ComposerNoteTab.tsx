/**
 * Вкладка «Нотатка» — типова вкладка композера.
 *
 * Поле вводу, вставка з буфера й місце під вкладення. Саме додавання фото,
 * відео й файлів — окрема тема: тут лише кнопки, які чесно кажуть, що вона
 * ще не зроблена (заглушку показує композер через `useDialog`).
 *
 * Пояснювального тексту під полем немає навмисно: усе, що потрібно знати про
 * вкладення, сказано самою кнопкою, а абзац-інструкція лише з'їдав місце.
 *
 * @module @wwwuabot/ui/composer
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { AttachmentKind, ComposerNoteTabProps } from "./types";
import { useAutoGrowField } from "./useAutoGrowField";

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
  const inputRef = useAutoGrowField(note);

  return (
    <div className="wb-composer-pane">
      {/* Дії — НАД полем: спершу те, чим нотатку наповнюють, далі саме поле.
          Кнопки — ті самі клітинки, що й вкладки зліва: без рамки й тла, самі
          іконки, а ім'я дії їде в `aria-label` і `title`. */}
      <div className="wb-composer-tools">
        {/* Вставка — єдина дія, яка вже працює: решта вкладень окремою темою */}
        <button
          type="button"
          className="wb-composer-tool"
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
            className="wb-composer-tool"
            aria-label={item.label}
            title={item.label}
            onClick={() => onAttach(item.kind)}
          >
            <Icon name={item.icon} size={18} />
          </button>
        ))}
      </div>

      <textarea
        ref={inputRef}
        className="wb-textarea wb-composer-input"
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="Почніть писати…"
        aria-label="Текст нотатки"
      />

      {error && (
        <p className="wb-composer-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
