/**
 * Демо-інтерфейс: поля, статуси, списки, люди, хром і вікно.
 *
 * Класи — спільні кирпичики продукту; тут лише розкладка, щоб побачити їх
 * поруч, а не на п'яти різних екранах.
 * @module web-admin-dev/src/pages/style/DemoUi
 */

import { Icon } from "@wwwuabot/shared";
import { BadgeBlock, ButtonsBlock } from "@wwwuabot/ui/blocks";
import { demo } from "./demo";

export function DemoUi() {
  return (
    <>
      <section className="st-section">
        <h3 className="st-section-title">Поля й керування</h3>
        <div className="st-grid">
          <div className="st-panel">
            <div className="wb-field">
              <label className="wb-label" htmlFor="demo-field-name">
                Назва
              </label>
              <input id="demo-field-name" className="wb-input" defaultValue="Мій проєкт" readOnly />
              <span className="wb-field-hint">Видно всім, хто має посилання</span>
            </div>
            <div className="wb-field">
              <label className="wb-label" htmlFor="demo-field-error">
                Адреса
              </label>
              <input
                id="demo-field-error"
                className="wb-input wb-input-error"
                defaultValue="моя сторінка"
                readOnly
              />
              <span className="wb-field-hint">Лише латиниця, цифри й дефіс</span>
            </div>
          </div>

          <div className="st-panel">
            <select className="wb-select" defaultValue="cards" aria-label="Вигляд списку">
              <option value="cards">Картки</option>
              <option value="rows">Рядки</option>
            </select>
            <textarea
              className="wb-textarea"
              rows={3}
              defaultValue="Кілька рядків тексту: поле росте разом із вмістом."
              aria-label="Опис"
              readOnly
            />
          </div>

          <div className="st-panel">
            <div className="wb-switch-row">
              <span className="wb-switch-text">
                <span className="wb-switch-label">Публічний профіль</span>
                <span className="wb-switch-hint">Вас видно іншим</span>
              </span>
              <span className="wb-switch wb-switch--on">
                <span className="wb-switch-knob" />
              </span>
            </div>
            <div className="wb-switch-row">
              <span className="wb-switch-text">
                <span className="wb-switch-label">Сповіщення</span>
                <span className="wb-switch-hint">Лише важливі події</span>
              </span>
              <span className="wb-switch">
                <span className="wb-switch-knob" />
              </span>
            </div>
          </div>

          <div className="st-panel">
            <BadgeBlock
              {...demo("badge", {
                items: [
                  { text: "активний", variant: "accent" },
                  { text: "виконано", variant: "green" },
                  { text: "очікує", variant: "yellow" },
                  { text: "відхилено", variant: "red" },
                  { text: "чернетка", variant: "neutral" },
                ],
              })}
            />
            <div className="st-row">
              <span className="wb-chip">Подорожі</span>
              <span className="wb-chip">Книги</span>
              <span className="wb-chip-sm">дрібний</span>
            </div>
            <ButtonsBlock
              {...demo("buttons", {
                items: [
                  { text: "Зберегти", variant: "primary" },
                  { text: "Скасувати", variant: "secondary" },
                  { text: "Видалити", variant: "ghost" },
                ],
              })}
            />
          </div>
        </div>
      </section>

      <section className="st-section">
        <h3 className="st-section-title">Списки, люди, порожній стан</h3>
        <div className="st-grid">
          <div className="st-panel">
            <div className="wb-menu-list">
              <button type="button" className="wb-menu-item">
                <span className="wb-menu-item-icon">
                  <Icon name="home" size={18} />
                </span>
                <span className="wb-menu-item-text">
                  <span className="wb-menu-item-label">Головна</span>
                  <span className="wb-menu-item-hint">Тут ти</span>
                </span>
              </button>
              <button type="button" className="wb-menu-item">
                <span className="wb-menu-item-icon">
                  <Icon name="users" size={18} />
                </span>
                <span className="wb-menu-item-text">
                  <span className="wb-menu-item-label">Люди</span>
                  <span className="wb-menu-item-hint">Усі, хто має доступ</span>
                </span>
                <span className="wb-menu-item-check">
                  <Icon name="check" size={16} />
                </span>
              </button>
            </div>
          </div>

          <div className="st-panel">
            <div className="wb-person">
              <span className="wb-person-photo">
                <span className="wb-person-initial">С</span>
              </span>
              <span className="wb-person-body">
                <span className="wb-person-name">Сергій</span>
                <span className="wb-person-about">Пишу про те, що встиг</span>
              </span>
            </div>
            <div className="wb-profile">
              <span className="wb-profile-title">Дані Telegram</span>
              <div className="wb-profile-fields">
                <div className="wb-profile-field">
                  <span className="wb-profile-label">Ім'я</span>
                  <span className="wb-profile-value">Сергій</span>
                </div>
                <div className="wb-profile-field">
                  <span className="wb-profile-label">Мова</span>
                  <span className="wb-profile-value">uk</span>
                </div>
              </div>
            </div>
          </div>

          <div className="st-panel">
            <div className="wb-empty">
              <span className="wb-empty-icon">
                <Icon name="folder" size={24} />
              </span>
              <span className="wb-empty-text">Поки порожньо — і це видно словами</span>
            </div>
            <span className="wb-skeleton" />
            <span className="wb-skeleton" />
          </div>
        </div>
      </section>

      <section className="st-section">
        <h3 className="st-section-title">Хром і вікно</h3>
        <div className="st-grid">
          <div className="st-panel">
            <div className="wb-subbar st-subbar">
              <div className="wb-subbar-inner">
                <span className="wb-subbar-item wb-subbar-item--active">
                  <span className="wb-subbar-label">Сьогодні</span>
                </span>
                <span className="wb-subbar-item">
                  <span className="wb-subbar-label">Тиждень</span>
                </span>
                <span className="wb-subbar-item">
                  <span className="wb-subbar-label">Місяць</span>
                </span>
              </div>
            </div>
            <div className="wb-tabbar st-tabbar">
              <div className="wb-tabbar-inner">
                <span className="wb-tabbar-item wb-tabbar-item--active">
                  <Icon name="home" size={24} />
                  <span className="wb-tabbar-label">Головна</span>
                </span>
                <span className="wb-tabbar-item">
                  <Icon name="thumbs-up" size={24} />
                  <span className="wb-tabbar-badge">3</span>
                </span>
                <span className="wb-tabbar-item">
                  <Icon name="bar-chart" size={24} />
                </span>
                <span className="wb-tabbar-item">
                  <Icon name="grid" size={24} />
                </span>
              </div>
            </div>
          </div>

          <div className="st-panel">
            <div className="wb-modal">
              <div className="wb-modal-header">
                <span className="wb-modal-title">Підтвердження</span>
                <button type="button" className="wb-modal-close" aria-label="Закрити">
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className="wb-modal-body">
                <p className="wb-text-base wb-text-secondary">
                  Вікно стоїть над скримом, а не в потоці сторінки.
                </p>
              </div>
              <div className="wb-modal-footer">
                <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm">
                  Скасувати
                </button>
                <button type="button" className="wb-btn wb-btn-primary wb-btn-sm">
                  Так
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
