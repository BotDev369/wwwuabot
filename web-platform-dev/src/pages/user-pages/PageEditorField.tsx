/**
 * Одне поле шаблону — **на самій сторінці**, а не в списку полів.
 *
 * У цьому й сенс кроку: людина не заповнює форму «назва / підзаголовок /
 * абзац», а **править текст там, де він стоятиме**. Тож поле намальовано тим
 * самим виглядом, що й готовий блок:
 *
 * - **підпис** («Про себе», «Коли») — це структура шаблону, його не редагують,
 *   і він їде тими самими класами рівня, що й заголовок блока (`TextBlock`);
 * - **значення** — те, що людина пише: поле вводу, яке успадковує шрифт
 *   підпису-обгортки (`font: inherit`), тож жодних «полів зі своїм шрифтом»
 *   поруч зі сторінкою не видно.
 *
 * **Рівень значення — не смак, а той самий поділ, що в `buildPageConfig`.**
 * Назву показують заголовком, а текст під підписом — приглушеним тілом
 * (`fieldIsHeading`): редактор і сторінка беруть це з одного місця, тож
 * розійтись не можуть.
 *
 * **Абзац росте за текстом.** `resize: vertical` на телефоні не існує (ручки
 * немає в жодному WebView), тож висоту дає `useAutoGrowField` — той самий, що
 * в композері: поле, яке не росте, ховало б написане під власною прокруткою.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ChangeEvent, ReactElement } from "react";
import { TEXT_LEVEL_CLASSES } from "@wwwuabot/ui/blocks";
import { useAutoGrowField } from "@wwwuabot/ui/hooks";
import { fieldIsHeading, type PageField } from "@wwwuabot/shared/pages";

/**
 * Стеля росту абзацу в рядках.
 *
 * Вище — поле перестає рости й починає прокручуватись: сторінка мусить лишатись
 * сторінкою, а не одним суцільним полем на весь екран.
 */
const MAX_TEXT_ROWS = 14;

export function PageEditorField({
  field,
  value,
  onChange,
}: {
  field: PageField;
  value: string;
  onChange: (value: string) => void;
}): ReactElement {
  const id = `wb-page-field-${field.key}`;
  const textareaRef = useAutoGrowField(value, MAX_TEXT_ROWS);
  const heading = fieldIsHeading(field);
  const level = TEXT_LEVEL_CLASSES[field.block.level] ?? "";

  const common = {
    id,
    className: "wb-page-field-input",
    value,
    maxLength: field.max,
    placeholder: field.placeholder,
    "aria-label": field.label,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
  };

  return (
    <div className="wb-page-field">
      {field.block.title && (
        <span className={`wb-page-field-label ${level}`}>{field.block.title}</span>
      )}
      <div className={`${heading ? "wb-page-field-heading" : "wb-page-field-body"} ${level}`}>
        {field.kind === "text" ? (
          <textarea ref={textareaRef} rows={1} {...common} />
        ) : (
          <input {...common} />
        )}
      </div>
    </div>
  );
}
