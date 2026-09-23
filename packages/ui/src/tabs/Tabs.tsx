import type { ReactElement } from "react";

/**
 * Вкладки на всю ширину — «два погляди на те саме».
 *
 * **Чому кирпичик.** Той самий рядок уже стояв у розділах акаунта, і другий
 * такий у Просторі розійшовся б із першим на першій же правці: id для
 * `aria-labelledby`, порядок атрибутів, вибір заливки — усе це легко зробити
 * «майже так» (AGENTS.md §3).
 *
 * **Форма береться в кнопки, стан — у спільного маркера.** Клас `wb-tabs-btn`
 * дає саму розкладку, форму й висоту — `wb-btn` (обидві вкладки прозорі,
 * `wb-btn-ghost`), а обрану показує `wb-tabs-btn--active`: **акцент і вага, без
 * заливки** (правило 25 — те саме, що в пункту сайдбара й у футері). Власний
 * `border-radius` зробив би вкладки прямокутними в обох брендів — так і було,
 * хоч решта кнопок продукту округлена.
 *
 * **Ролі ARIA ставить кирпичик.** `role="tablist"` / `role="tab"` без
 * відповідної позначки на вмісті гірші за їх відсутність, тож id панелі
 * складається тією самою функцією, що й id вкладки — `tabPanelId`.
 */
export interface TabOption<K extends string = string> {
  key: K;
  label: string;
}

/** Ідентифікатор вкладки — щоб `aria-labelledby` панелі вказував саме на неї. */
export function tabId(key: string): string {
  return `wb-tab-${key}`;
}

/** Ідентифікатор панелі — пара до `tabId`. */
export function tabPanelId(key: string): string {
  return `wb-tabpanel-${key}`;
}

export function Tabs<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly TabOption<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Назва смуги для читача з екрана: «Розділи акаунта», «Розділи простору». */
  label: string;
}): ReactElement {
  return (
    <div className="wb-tabs" role="tablist" aria-label={label}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            id={tabId(option.key)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={tabPanelId(option.key)}
            className={`wb-btn wb-btn-ghost wb-tabs-btn${active ? " wb-tabs-btn--active" : ""}`}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
