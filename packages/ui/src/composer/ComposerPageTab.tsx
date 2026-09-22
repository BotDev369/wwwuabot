import type { ReactElement, ReactNode } from "react";
import { PAGE_TEMPLATES } from "@wwwuabot/shared/pages";
import { SwitchRow } from "@wwwuabot/shared";
import type { PageDraftState } from "./usePageDraft";

/**
 * Вкладка «Сторінка» — створення сторінки з готового шаблону.
 *
 * **Людина змінює лише текст.** Структуру (зони, блоки, рівні заголовків)
 * задає шаблон; на екрані видно тільки поля шаблону й адресу. Це і є сенс
 * кроку «створення з готових шаблонів»: редактор блоків лишається в адмінці,
 * а тут людина пише те, що хотіла сказати.
 *
 * **Шаблон обирають кнопками, а не списком.** Дропдауни в продукті заборонені
 * (§4), шаблонів два, і ряд із двох кнопок показує їх одразу — разом із тим,
 * чим вони різняться (підпис під рядом змінюється разом із вибором).
 *
 * **Приватність — той самий перемикач, що у профілю** (`SwitchRow`), і типово
 * вона вимкнена: показувати сторінку іншим людина мусить сама. Стан пише
 * сервер, тож увімкнене тут — це вже збережене, а не намір.
 */
export function ComposerPageTab({
  page,
  error,
  actions,
}: {
  page: PageDraftState;
  error: string | null;
  /** Кнопки дії — останній рядок тіла (їх тримає композер, не вкладка). */
  actions?: ReactNode;
}): ReactElement {
  return (
    <div className="wb-composer-pane">
      <div className="wb-composer-field">
        <span className="wb-label">Шаблон</span>
        <div className="wb-composer-kinds" role="group" aria-label="Шаблон сторінки">
          {PAGE_TEMPLATES.map((template) => {
            const active = template.key === page.template.key;
            return (
              <button
                key={template.key}
                type="button"
                className={`wb-composer-kind${active ? " wb-composer-kind--active" : ""}`}
                aria-pressed={active}
                onClick={() => page.setTemplateKey(template.key)}
              >
                {template.label}
              </button>
            );
          })}
        </div>
        <span className="wb-text-muted wb-text-xs">{page.template.hint}</span>
      </div>

      {page.template.fields.map((field) => {
        const id = `wb-page-field-${field.key}`;
        const value = page.draft.values[field.key] ?? "";
        return (
          <div className="wb-composer-field" key={field.key}>
            <label className="wb-label" htmlFor={id}>
              {field.label}
            </label>
            {field.kind === "text" ? (
              <textarea
                id={id}
                className="wb-composer-input"
                value={value}
                maxLength={field.max}
                placeholder={field.placeholder}
                onChange={(event) => page.setValue(field.key, event.target.value)}
              />
            ) : (
              <input
                id={id}
                className="wb-composer-input"
                value={value}
                maxLength={field.max}
                placeholder={field.placeholder}
                onChange={(event) => page.setValue(field.key, event.target.value)}
              />
            )}
          </div>
        );
      })}

      <div className="wb-composer-field">
        <label className="wb-label" htmlFor="wb-page-address">
          Адреса
        </label>
        <input
          id="wb-page-address"
          className={`wb-composer-input${page.addressIssue ? " wb-input-error" : ""}`}
          value={page.address}
          placeholder="складемо з назви"
          onChange={(event) => page.setAddress(event.target.value)}
        />
        {/* Причину показуємо там, де поле: зайнята платформою адреса — це не
            помилка збереження, а вибір, який треба зробити зараз. */}
        <span className="wb-text-muted wb-text-xs">
          {page.addressIssue ?? `Посилання: /${page.address || "…"}`}
        </span>
      </div>

      <SwitchRow
        label="Публічна сторінка"
        hint={page.draft.isPublic ? "Видно всім у Просторі" : "Видно лише вам"}
        checked={page.draft.isPublic}
        onToggle={page.setPublic}
      />

      {error && (
        <p className="wb-composer-error" role="alert">
          {error}
        </p>
      )}

      {actions && <div className="wb-sheet-actions">{actions}</div>}
    </div>
  );
}
