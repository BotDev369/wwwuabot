/**
 * Статуси, навігація, порожній стан, завантаження й модалка.
 *
 * Усе — наявні кирпичики (`.wb-badge`, `.wb-chip`, `.wb-modal*`) плюс ролі
 * каталогу. Демо не заводить власних кнопок і власних станів.
 *
 * @module web-admin-dev/src/pages/style/MiscSection
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";

const NAV = [
  { icon: "home", label: "Головна", on: true },
  { icon: "users", label: "Люди", on: false },
  { icon: "message-square", label: "Повідомлення", on: false },
  { icon: "list", label: "Трекери", on: false },
] as const;

export function MiscSection(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <section className="sc-section">
      <div className="sc-sect-head">
        <h3 className="sc-sect-title">Стани, навігація, порожнеча й рух</h3>
        <span className="sc-sect-note">все живе: модалка відкривається, вкладки перемикаються</span>
      </div>

      <div className="sc-grid">
        <article className="sc-card">
          <h4 className="sc-card-title">Статуси</h4>
          <div className="sc-inline">
            <span className="wb-badge wb-badge-green">активний</span>
            <span className="wb-badge wb-badge-yellow">очікує</span>
            <span className="wb-badge wb-badge-red">відхилено</span>
            <span className="wb-badge wb-badge-neutral">чернетка</span>
            <span className="wb-badge wb-badge-accent">нове</span>
          </div>
          <div className="sc-inline">
            <span className="wb-chip">Подорожі</span>
            <span className="wb-chip">Книги</span>
            <span className="wb-chip-sm">дрібний</span>
          </div>
        </article>

        <article className="sc-card">
          <h4 className="sc-card-title">Навігація</h4>
          <nav className="sc-nav" aria-label="Демо навігації">
            {NAV.map((item) => (
              <span
                className={item.on ? "sc-nav-link sc-nav-link-on" : "sc-nav-link"}
                key={item.label}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </span>
            ))}
          </nav>
        </article>

        <article className="sc-card">
          <h4 className="sc-card-title">Завантаження</h4>
          <span className="sc-skeleton sc-skeleton-lg sc-motion-pulse" />
          <span className="sc-skeleton sc-motion-pulse" />
          <span className="sc-skeleton sc-skeleton-sm sc-motion-pulse" />
          <p className="sc-demo-note">Місце під контент, який ще їде.</p>
        </article>
      </div>

      <div className="sc-grid">
        <div className="sc-empty">
          <span className="sc-tone-ink sc-size-head">Тут поки нічого</span>
          <span className="sc-tone-muted sc-size-body">
            Додайте перший запис — і цей блок заміниться вмістом.
          </span>
          <button type="button" className="wb-btn wb-btn-primary">
            Створити
          </button>
        </div>

        <div className="sc-card">
          <h4 className="sc-card-title">Модалка</h4>
          <p className="sc-demo-note">
            Меню й діалоги — модалка над скримом: висоту дає вміст, стоїть по центру.
          </p>
          <div className="sc-actions">
            <button type="button" className="wb-btn wb-btn-secondary" onClick={() => setOpen(true)}>
              Відкрити
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          className="wb-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="wb-modal" role="dialog" aria-modal="true" aria-label="Демо модалки">
            <div className="wb-modal-header">
              <h3 className="wb-modal-title">Демо модалки</h3>
              <button
                type="button"
                className="wb-close-btn"
                onClick={() => setOpen(false)}
                aria-label="Закрити"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="wb-modal-body">
              <p className="sc-tone-muted sc-size-body">
                Той самий вигляд, що в платформі: поверхня, шапка, кнопки й відступ — із каталогу, а
                не з цієї сторінки.
              </p>
            </div>
            <div className="wb-modal-footer">
              <button
                type="button"
                className="wb-btn wb-btn-primary"
                onClick={() => setOpen(false)}
              >
                Гаразд
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
