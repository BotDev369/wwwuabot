/**
 * Прев'ю кирпичиків: поверхні, статуси, списки й навігація.
 *
 * Смуги (футер, друга смуга) у продукті `position: fixed`, тож у рамці їх
 * повертають у потік `.st-tabbar` / `.st-subbar`.
 *
 * @module web-admin-dev/src/pages/style/previews-surfaces
 */

import { Icon } from "@wwwuabot/shared";
import type { BrickGroup } from "./previews";

export const SURFACE_GROUPS: BrickGroup[] = [
  {
    id: "surfaces",
    title: "Поверхні",
    items: [
      {
        id: "card",
        title: "Картка",
        classes: ["wb-card", "wb-card-header", "wb-card-title", "wb-card-body"],
        node: (
          <div className="wb-card">
            <div className="wb-card-header">
              <span className="wb-card-title">Дані на платформі</span>
            </div>
            <div className="wb-card-body">
              <p className="wb-text-base wb-text-secondary">
                Картка світліша за екран і тримає край волосиною.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "sheet",
        title: "Поверхня-панель",
        classes: ["wb-modal", "wb-sheet", "wb-sheet-head", "wb-sheet-actions"],
        node: (
          <div className="wb-modal wb-sheet">
            <div className="wb-modal-header wb-sheet-head">
              <span className="wb-modal-title">Вигляд</span>
            </div>
            <div className="wb-modal-body">
              <p className="wb-text-sm wb-text-muted">Висоту панелі дає вміст, стеля — екран.</p>
            </div>
            <div className="wb-modal-footer wb-sheet-actions">
              <button type="button" className="wb-btn wb-btn-primary wb-btn-sm">
                Готово
              </button>
            </div>
          </div>
        ),
      },
      {
        id: "modal",
        title: "Вікно",
        classes: [
          "wb-modal",
          "wb-modal-header",
          "wb-modal-title",
          "wb-modal-body",
          "wb-modal-footer",
        ],
        node: (
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
        ),
      },
      {
        id: "empty",
        title: "Порожній стан",
        classes: ["wb-empty", "wb-empty-icon", "wb-empty-text"],
        node: (
          <div className="wb-empty">
            <span className="wb-empty-icon">
              <Icon name="folder" size={24} />
            </span>
            <span className="wb-empty-text">Поки порожньо — і це видно словами</span>
          </div>
        ),
      },
      {
        id: "skeleton",
        title: "Заглушка завантаження",
        classes: ["wb-skeleton"],
        node: (
          <div className="st-stack">
            <span className="wb-skeleton" />
            <span className="wb-skeleton" />
          </div>
        ),
      },
    ],
  },
  {
    id: "statuses",
    title: "Статуси й позначки",
    items: [
      {
        id: "badges",
        title: "Плашки статусів",
        classes: [
          "wb-badge",
          "wb-badge-accent",
          "wb-badge-green",
          "wb-badge-red",
          "wb-badge-yellow",
          "wb-badge-neutral",
        ],
        node: (
          <div className="st-row">
            <span className="wb-badge wb-badge-accent">активний</span>
            <span className="wb-badge wb-badge-green">виконано</span>
            <span className="wb-badge wb-badge-yellow">очікує</span>
            <span className="wb-badge wb-badge-red">відхилено</span>
            <span className="wb-badge wb-badge-neutral">чернетка</span>
          </div>
        ),
      },
      {
        id: "chips",
        title: "Чипи й теги",
        classes: ["wb-chip", "wb-chip-sm"],
        node: (
          <div className="st-row">
            <span className="wb-chip">Подорожі</span>
            <span className="wb-chip">Книги</span>
            <span className="wb-chip-sm">дрібний</span>
          </div>
        ),
      },
      {
        id: "switch",
        title: "Перемикач",
        classes: [
          "wb-switch-row",
          "wb-switch-text",
          "wb-switch-label",
          "wb-switch",
          "wb-switch-knob",
        ],
        node: (
          <div className="wb-switch-row">
            <span className="wb-switch-text">
              <span className="wb-switch-label">Публічний профіль</span>
              <span className="wb-switch-hint">Вас видно іншим</span>
            </span>
            <span className="wb-switch wb-switch--on">
              <span className="wb-switch-knob" />
            </span>
          </div>
        ),
      },
    ],
  },
  {
    id: "lists",
    title: "Списки й таблиці",
    items: [
      {
        id: "menu",
        title: "Пункт списку",
        classes: [
          "wb-menu-list",
          "wb-menu-item",
          "wb-menu-item-icon",
          "wb-menu-item-text",
          "wb-menu-item-label",
          "wb-menu-item-hint",
        ],
        node: (
          <div className="wb-menu-list">
            <button type="button" className="wb-menu-item">
              <span className="wb-menu-item-icon">
                <Icon name="home" size={18} />
              </span>
              <span className="wb-menu-item-text">
                <span className="wb-menu-item-label">Головна</span>
                <span className="wb-menu-item-hint">Тут ти</span>
              </span>
              <span className="wb-menu-item-check">
                <Icon name="check" size={16} />
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
            </button>
          </div>
        ),
      },
      {
        id: "table",
        title: "Таблиця",
        classes: ["wb-table-wrap", "wb-table"],
        node: (
          <div className="wb-table-wrap">
            <table className="wb-table">
              <thead>
                <tr>
                  <th>Ім'я</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Сергій</td>
                  <td>30.10</td>
                </tr>
                <tr>
                  <td>Олена</td>
                  <td>29.10</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        id: "profile-rows",
        title: "Рядок «підпис — значення»",
        classes: [
          "wb-profile",
          "wb-profile-title",
          "wb-profile-fields",
          "wb-profile-field",
          "wb-profile-label",
          "wb-profile-value",
        ],
        node: (
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
        ),
      },
    ],
  },
  {
    id: "nav",
    title: "Навігація",
    items: [
      {
        id: "tabbar",
        title: "Футер застосунку",
        classes: [
          "wb-tabbar",
          "wb-tabbar-inner",
          "wb-tabbar-item",
          "wb-tabbar-item--active",
          "wb-tabbar-label",
          "wb-tabbar-badge",
        ],
        node: (
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
                <Icon name="lotus" size={24} />
              </span>
              <span className="wb-tabbar-item">
                <Icon name="grid" size={24} />
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "subbar",
        title: "Друга смуга",
        classes: [
          "wb-subbar",
          "wb-subbar-inner",
          "wb-subbar-item",
          "wb-subbar-item--active",
          "wb-subbar-label",
        ],
        node: (
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
        ),
      },
      {
        id: "page-head",
        title: "Шапка екрана",
        classes: ["wb-page", "wb-page-head", "wb-page-title", "wb-page-actions"],
        node: (
          <div className="wb-page st-page-demo">
            <div className="wb-page-head">
              <span className="wb-page-title">Нотатки</span>
              <div className="wb-page-actions">
                <button type="button" className="wb-btn wb-btn-primary wb-btn-sm">
                  <Icon name="plus" size={14} />
                  Додати
                </button>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "person",
        title: "Людина в списку",
        classes: [
          "wb-person",
          "wb-person-photo",
          "wb-person-initial",
          "wb-person-body",
          "wb-person-name",
          "wb-person-about",
        ],
        node: (
          <div className="wb-person">
            <span className="wb-person-photo">
              <span className="wb-person-initial">С</span>
            </span>
            <span className="wb-person-body">
              <span className="wb-person-name">Сергій</span>
              <span className="wb-person-about">Пишу про те, що встиг</span>
            </span>
          </div>
        ),
      },
    ],
  },
];
