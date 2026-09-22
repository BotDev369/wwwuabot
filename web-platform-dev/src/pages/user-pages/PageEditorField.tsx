/**
 * Одне поле шаблону — **на самій сторінці**, а не в списку полів.
 *
 * У цьому й сенс кроку: людина не заповнює форму «назва / підзаголовок /
 * абзац», а **править текст там, де він стоятиме**. Тож поле намальовано тим
 * самим виглядом, що й готовий блок:
 *
 * - **підпис** («Про себе», «Коли») — це структура шаблону, його не редагують,
 *   і він їде тими самими класами рівня, що й заголовок картки (`CardBlock`);
 * - **значення** — те, що людина пише: поле вводу, яке успадковує шрифт
 *   підпису-обгортки (`font: inherit`), тож жодних «полів зі своїм шрифтом»
 *   поруч зі сторінкою не видно.
 *
 * **Щабель значення — не смак, а те саме, що на сторінці.** `field.look` — це
 * рівень, яким значення стоїть у каркасі (`templates.ts`), і обидва читачі
 * беруть його зі спільного `TEXT_LEVEL_CLASSES`: розійтись редактор і сторінка
 * не можуть, бо це той самий список.
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
import type { PageField, PageFieldLook } from "@wwwuabot/shared/pages";

/**
 * Стеля росту абзацу в рядках.
 *
 * Вище — поле перестає рости й починає прокручуватись: сторінка мусить лишатись
 * сторінкою, а не одним суцільним полем на весь екран.
 */
const MAX_TEXT_ROWS = 14;

/** Щабель значення — той самий, яким його показує блок на сторінці. */
const LOOK_CLASSES: Record<PageFieldLook, string> = {
  display: TEXT_LEVEL_CLASSES.h1,
  lead: TEXT_LEVEL_CLASSES.h3,
  body: TEXT_LEVEL_CLASSES.body,
};

/** Підпис розділу — як заголовок картки: щаблем нижче за назву сторінки. */
const SECTION_CLASSES = TEXT_LEVEL_CLASSES.h4;

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
  const look = LOOK_CLASSES[field.look] ?? LOOK_CLASSES.body;

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
      {field.section && (
        <span className={`wb-page-field-label ${SECTION_CLASSES}`}>{field.section}</span>
      )}
      <div className={`wb-page-field-value wb-page-field-value--${field.look} ${look}`}>
        {field.kind === "text" ? (
          <textarea ref={textareaRef} rows={1} {...common} />
        ) : (
          <input {...common} />
        )}
      </div>
    </div>
  );
}
