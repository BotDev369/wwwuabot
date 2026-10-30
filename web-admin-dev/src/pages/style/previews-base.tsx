/**
 * Прев'ю кирпичиків: текст, кнопки й поля.
 *
 * Розмітка справжня — та сама, що на екрані, зі спільними класами
 * `packages/shared/src/styles/`.
 *
 * @module web-admin-dev/src/pages/style/previews-base
 */

import { Icon } from "@wwwuabot/shared";
import type { BrickGroup } from "./previews";

export const BASE_GROUPS: BrickGroup[] = [
  {
    id: "text",
    title: "Текст",
    items: [
      {
        id: "headings",
        title: "Заголовки h1–h3",
        classes: ["h1", "h2", "h3"],
        node: (
          <div className="st-stack">
            <h1>Заголовок екрана</h1>
            <h2>Заголовок частини</h2>
            <h3>Заголовок картки</h3>
          </div>
        ),
      },
      {
        id: "text-levels",
        title: "Рівні тексту",
        classes: ["wb-text-2xl", "wb-text-xl", "wb-text-lg", "wb-text-md", "wb-text-base"],
        node: (
          <div className="st-stack">
            <p className="wb-text-2xl">28 — число, що тримає екран</p>
            <p className="wb-text-xl">22 — назва розділу</p>
            <p className="wb-text-lg">18 — великий рядок</p>
            <p className="wb-text-md">16 — основний текст</p>
            <p className="wb-text-base">14 — щільний текст</p>
          </div>
        ),
      },
      {
        id: "text-tones",
        title: "Тони тексту",
        classes: [
          "wb-text-primary",
          "wb-text-secondary",
          "wb-text-muted",
          "wb-text-sm",
          "wb-text-xs",
        ],
        node: (
          <div className="st-stack">
            <p className="wb-text-base wb-text-primary">Основний — те, що читають</p>
            <p className="wb-text-base wb-text-secondary">Другорядний — пояснення</p>
            <p className="wb-text-sm wb-text-muted">Підказка — 13px, тихіше</p>
            <p className="wb-text-xs wb-text-muted">Підпис — 11px, найтонше</p>
          </div>
        ),
      },
      {
        id: "text-weights",
        title: "Вага й наголос",
        classes: ["wb-font-semibold", "wb-font-bold", "wb-text-red", "wb-text-green"],
        node: (
          <div className="st-stack">
            <p className="wb-text-base wb-font-semibold">Напівжирний</p>
            <p className="wb-text-base wb-font-bold">Жирний</p>
            <p className="wb-text-base wb-text-red">Помилка</p>
            <p className="wb-text-base wb-text-green">Успіх</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "buttons",
    title: "Кнопки",
    items: [
      {
        id: "buttons-main",
        title: "Чотири ролі кнопки",
        classes: ["wb-btn", "wb-btn-primary", "wb-btn-secondary", "wb-btn-ghost", "wb-btn-danger"],
        node: (
          <div className="st-row">
            <button type="button" className="wb-btn wb-btn-primary">
              Зберегти
            </button>
            <button type="button" className="wb-btn wb-btn-secondary">
              Скасувати
            </button>
            <button type="button" className="wb-btn wb-btn-ghost">
              Пізніше
            </button>
            <button type="button" className="wb-btn wb-btn-danger">
              Видалити
            </button>
          </div>
        ),
      },
      {
        id: "buttons-size",
        title: "Кнопка зі знаком і компактна",
        classes: ["wb-btn", "wb-btn-sm", "wb-appbar__btn", "wb-close-btn"],
        node: (
          <div className="st-row">
            <button type="button" className="wb-btn wb-btn-primary">
              <Icon name="plus" size={16} />
              Створити
            </button>
            <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm">
              <Icon name="filter" size={14} />
              Фільтр
            </button>
            <button type="button" className="wb-appbar__btn" aria-label="Меню">
              <Icon name="more" size={18} />
            </button>
            <button type="button" className="wb-close-btn" aria-label="Закрити">
              <Icon name="close" size={16} />
            </button>
          </div>
        ),
      },
      {
        id: "segmented",
        title: "Перемикач режиму",
        classes: [
          "wb-segmented",
          "wb-segmented-btn",
          "wb-segmented-btn--active",
          "wb-tabs",
          "wb-tabs-btn",
          "wb-tabs-btn--active",
        ],
        node: (
          <div className="st-stack">
            <div className="wb-segmented">
              <button type="button" className="wb-segmented-btn wb-segmented-btn--active">
                Список
              </button>
              <button type="button" className="wb-segmented-btn">
                Картки
              </button>
            </div>
            <div className="wb-tabs">
              <button type="button" className="wb-btn wb-btn-ghost wb-tabs-btn wb-tabs-btn--active">
                Телеграм
              </button>
              <button type="button" className="wb-btn wb-btn-ghost wb-tabs-btn">
                Платформа
              </button>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "fields",
    title: "Поля",
    items: [
      {
        id: "field",
        title: "Поле з підписом і підказкою",
        classes: ["wb-field", "wb-label", "wb-input", "wb-field-hint"],
        node: (
          <div className="wb-field">
            <label className="wb-label" htmlFor="st-field-demo">
              Назва
            </label>
            <input id="st-field-demo" className="wb-input" defaultValue="Мій проєкт" readOnly />
            <span className="wb-field-hint">Видно всім, хто має посилання</span>
          </div>
        ),
      },
      {
        id: "field-error",
        title: "Поле з помилкою",
        classes: ["wb-input", "wb-input-error", "wb-field-hint"],
        node: (
          <div className="wb-field">
            <label className="wb-label" htmlFor="st-field-error">
              Адреса
            </label>
            <input
              id="st-field-error"
              className="wb-input wb-input-error"
              defaultValue="моя сторінка"
              readOnly
            />
            <span className="wb-field-hint">Лише латиниця, цифри й дефіс</span>
          </div>
        ),
      },
      {
        id: "select-textarea",
        title: "Вибір і багаторядкове поле",
        classes: ["wb-select", "wb-textarea"],
        node: (
          <div className="st-stack">
            <select className="wb-select" defaultValue="cards" aria-label="Вигляд">
              <option value="cards">Картки</option>
              <option value="rows">Рядки</option>
            </select>
            <textarea
              className="wb-textarea"
              rows={2}
              defaultValue="Кілька рядків тексту."
              readOnly
            />
          </div>
        ),
      },
      {
        id: "search",
        title: "Пошук по списку",
        classes: ["wb-tools-search", "wb-tools-search-icon", "wb-input"],
        node: (
          <div className="wb-tools-search">
            <Icon name="search" size={16} />
            <input className="wb-input" placeholder="Знайти людину" readOnly />
          </div>
        ),
      },
    ],
  },
];
