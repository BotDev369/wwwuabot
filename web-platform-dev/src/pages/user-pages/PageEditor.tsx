/**
 * Редактор сторінки — **екран**, а не форма.
 *
 * Розділ «Створити» з підписами полів нічого не казав про те, що вийде: щоб
 * побачити сторінку, її треба було уявити за назвами полів. Тут навпаки —
 * спершу шаблон **бачать** (вибір), а потім правлять текст **на ньому самому**
 * (`PageEditorField`: підписи структури лишаються на місці, текст стає полем
 * уводу), і сторінка перед очима рівно та, яку побачать інші.
 *
 * **Адреса й публічність — під сторінкою, а не в її тексті.** Це не текст
 * шаблону: адреса показує, чим сторінку відкриють, а перемикач — чи побачать її
 * в Просторі (типово — ні). Обидва належать сторінці цілком, тож обидва стоять
 * **поза** полотном, у своїй картці.
 *
 * **Стан показується після відповіді сервера.** Збереження повертає рядок із
 * сервера — ним і йде екран далі: показати «збережено» на власній здогадці
 * означало б обіцяти сторінку, якої немає (`docs/SPACE.md`).
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { Icon, SwitchRow } from "@wwwuabot/shared";
import type { UserPage } from "@wwwuabot/shared/pages";
import { PageEditorField } from "./PageEditorField";
import { usePageForm, type PageFormInitial } from "./usePageForm";

export type PageEditorMode = "create" | "edit";

export function PageEditor({
  mode,
  initial,
  onBack,
  onSaved,
}: {
  /** Створення чи правка — від цього залежать заголовок і підпис кнопки. */
  mode: PageEditorMode;
  initial: PageFormInitial;
  /**
   * Крок назад. Куди саме — знає екран: у створення під редактором лежить
   * вибір шаблону, у правки — перегляд сторінки.
   */
  onBack: () => void;
  /** Збережений рядок із сервера — екран веде далі ним, а не чернеткою. */
  onSaved: (page: UserPage) => void;
}): ReactElement {
  const form = usePageForm(initial);
  const editing = mode === "edit";

  async function submit(): Promise<void> {
    const saved = await form.save();
    if (saved) onSaved(saved);
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          <button type="button" className="wb-close-btn" onClick={onBack} aria-label="Назад">
            <Icon name="arrow-left" size={18} />
          </button>
          {editing ? "Змінити текст" : "Нова сторінка"}
        </h1>
      </div>

      {/* Сама сторінка: та сама `main`, яку рендерить `PageRenderer`, лише
          текст у ній — редагований. */}
      <div className="wb-page-editor">
        {form.template.fields.map((field) => (
          <PageEditorField
            key={field.key}
            field={field}
            value={form.draft.values[field.key] ?? ""}
            onChange={(value) => form.setValue(field.key, value)}
          />
        ))}
      </div>

      <div className="wb-card wb-page-settings-card">
        <div className="wb-card-body wb-page-settings">
          <div className="wb-page-settings-field">
            <label className="wb-label" htmlFor="wb-page-address">
              Адреса
            </label>
            {/* Поле адреси — звичайний кирпичик поля (`.wb-input`), а не поле
                нотатки: тут потрібен один рядок, а не три. */}
            <input
              id="wb-page-address"
              className={`wb-input${form.addressIssue ? " wb-input-error" : ""}`}
              value={form.address}
              placeholder="складемо з назви"
              onChange={(event) => form.setAddress(event.target.value)}
            />
            {/* Причину показуємо там, де поле: зайнята платформою адреса — це не
                помилка збереження, а вибір, який треба зробити зараз. */}
            <span className="wb-text-muted wb-text-xs">
              {form.addressIssue ?? `Посилання: /${form.address || "…"}`}
            </span>
          </div>

          <SwitchRow
            label="Публічна сторінка"
            hint={form.isPublic ? "Видно всім у Просторі" : "Видно лише вам"}
            checked={form.isPublic}
            onToggle={form.setPublic}
          />
        </div>
      </div>

      {form.error && (
        <p className="wb-text-red" role="alert">
          {form.error}
        </p>
      )}

      <div className="wb-sheet-actions">
        <button type="button" className="wb-btn wb-btn-secondary" onClick={onBack}>
          Скасувати
        </button>
        <button
          type="button"
          className="wb-btn wb-btn-primary"
          disabled={form.empty || form.saving}
          onClick={() => void submit()}
        >
          <Icon name="check" size={16} />
          {form.saving ? "Зберігаємо…" : editing ? "Зберегти зміни" : "Зберегти"}
        </button>
      </div>
    </div>
  );
}
