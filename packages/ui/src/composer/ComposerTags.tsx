/**
 * Поле хештегів: чипи з хрестиками й вузьке поле вводу в тому самому рядку.
 *
 * Це не «інпут із підказками», а саме перелік: тег завершується тим самим
 * дотиком, що й будь-де — пробілом, комою або Enter, тож окремої кнопки
 * «додати» не потрібно. Backspace на порожньому вводі прибирає останній тег:
 * так само поводяться поштові клієнти, і рука цього чекає.
 *
 * @module @wwwuabot/ui/composer
 */

import { useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";

/** Ідентифікатор вводу: на нього вказує `<label>` поля (див. `ComposerNoteTab`). */
export const TAG_INPUT_ID = "wb-composer-tag-input";

export interface ComposerTagsProps {
  tags: readonly string[];
  /** Додати хештеги з рядка (розбір і стелі — у `tags.ts`). */
  onAdd: (raw: string) => void;
  onRemove: (tag: string) => void;
}

export function ComposerTags({ tags, onAdd, onRemove }: ComposerTagsProps): ReactElement {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /** Пробіл чи кома в кінці означають «тег дописано» — саме так, як їх пишуть. */
  function handleChange(value: string): void {
    const done = /^(.*?)[\s,]+$/.exec(value);
    if (done) {
      onAdd(done[1]);
      setDraft("");
      return;
    }
    setDraft(value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      onAdd(draft);
      setDraft("");
      return;
    }
    if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      onRemove(tags[tags.length - 1]);
    }
  }

  return (
    // Дотик по порожньому місцю рядка має ставити курсор у ввід, а не губитись.
    <div className="wb-composer-tags" onClick={() => inputRef.current?.focus()}>
      {tags.map((tag) => (
        <span key={tag} className="wb-composer-tag">
          #{tag}
          <button
            type="button"
            className="wb-composer-tag-remove"
            aria-label={`Прибрати хештег ${tag}`}
            title={`Прибрати #${tag}`}
            onClick={() => onRemove(tag)}
          >
            <Icon name="close" size={12} />
          </button>
        </span>
      ))}

      <input
        id={TAG_INPUT_ID}
        ref={inputRef}
        className="wb-composer-tag-input"
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        // Підпис-підказка — лише поки порожньо: далі її місце займають чипи.
        placeholder={tags.length === 0 ? "Через пробіл або кому" : ""}
        aria-label="Додати хештег"
        autoComplete="off"
        enterKeyHint="done"
      />
    </div>
  );
}
