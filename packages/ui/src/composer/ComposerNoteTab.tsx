/**
 * Вкладка «Нотатка» — типова вкладка композера.
 *
 * Два поля, і в кожного свій підпис: «Нотатка» (текст) і «Хештеги» (мітки).
 * Підпис — не прикраса: у композері немає рамок, і саме він каже, де що.
 *
 * Саме додавання фото, відео й файлів — окрема тема: тут лише кнопки, які
 * чесно кажуть, що вона ще не зроблена (заглушку показує композер через
 * `useDialog`). Пояснювального абзацу під полями немає навмисно: усе, що
 * потрібно знати, сказано підписом і самою кнопкою, а абзац лише з'їдав місце.
 *
 * Кнопки дії приходять ззовні (`actions`) і стоять **у тілі** панелі —
 * останнім рядком (`.wb-sheet-actions`), а не в прибитому футері: кнопок
 * буде більше, ніж «Закрити» й «Зберегти», і фіксована смуга з'їдала б місце
 * в полів. Вкладка лише ставить їх у розклад: про збереження вона не знає.
 *
 * Поля — власні кирпичики композера (`.wb-composer-input`, `.wb-composer-tags`),
 * а не `.wb-textarea`/`.wb-input`: у брендових темах ті класи **примусово**
 * отримують рамку й відступи (`!important`), а в композері рамок немає за
 * рішенням — див. `docs/DESIGN_SYSTEM.md`, правило 13.
 *
 * @module @wwwuabot/ui/composer
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MAX_NOTE_LENGTH } from "@wwwuabot/shared/notes";
import { ComposerTags, TAG_INPUT_ID } from "./ComposerTags";
import type { AttachmentKind, ComposerNoteTabProps } from "./types";
import { useAutoGrowField } from "./useAutoGrowField";

/** Ідентифікатор поля тексту: на нього вказує підпис. */
const NOTE_INPUT_ID = "wb-composer-note-input";

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
  tags,
  onAddTag,
  onRemoveTag,
  onPaste,
  onAttach,
  error,
  actions,
}: ComposerNoteTabProps): ReactElement {
  const inputRef = useAutoGrowField(note);

  return (
    <div className="wb-composer-pane">
      {/* Дії — НАД полями: спершу те, чим нотатку наповнюють, далі сам текст.
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

      <div className="wb-composer-field">
        <label className="wb-label" htmlFor={NOTE_INPUT_ID}>
          Нотатка
        </label>
        <textarea
          id={NOTE_INPUT_ID}
          ref={inputRef}
          className="wb-composer-input"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Почніть писати…"
          // Стеля — зі спільного правила, яким api-dev перевіряє запис: поле
          // мусить не дати набрати те, що сервер потім обріже мовчки.
          maxLength={MAX_NOTE_LENGTH}
        />
      </div>

      <div className="wb-composer-field">
        <label className="wb-label" htmlFor={TAG_INPUT_ID}>
          Хештеги
        </label>
        <ComposerTags tags={tags} onAdd={onAddTag} onRemove={onRemoveTag} />
      </div>

      {error && (
        <p className="wb-composer-error" role="alert">
          {error}
        </p>
      )}

      {/* Останній рядок тіла — дії вкладки: вони прокручуються разом із
          полями, а не висять над ними (див. `.wb-sheet-actions` — спільний
          кирпичик повноекранних поверхонь). */}
      {actions && <div className="wb-sheet-actions">{actions}</div>}
    </div>
  );
}
