/**
 * Форми: поле, вибір, область тексту, перемикач і дії.
 *
 * Смуга-підсумок над полями — теж роль (`panel-strip`), а не окрема розмітка:
 * тому вона виглядає так само, як смуги на інших екранах.
 *
 * @module web-admin-dev/src/pages/style/FormSection
 */

import { useState, type ReactElement } from "react";
import { SwitchRow } from "@wwwuabot/shared";

export function FormSection(): ReactElement {
  const [publicProfile, setPublicProfile] = useState(true);
  const [alerts, setAlerts] = useState(false);

  return (
    <section className="sc-section">
      <div className="sc-sect-head">
        <h3 className="sc-sect-title">Форми</h3>
        <span className="sc-sect-note">підпис згори, підказка знизу, стан — перемикачем</span>
      </div>

      <div className="sc-card">
        <div className="sc-form">
          <div className="sc-field">
            <label className="sc-field-label" htmlFor="sc-name">
              Назва сторінки
            </label>
            <input id="sc-name" className="wb-input" defaultValue="Мій шлях" />
          </div>
          <div className="sc-field">
            <label className="sc-field-label" htmlFor="sc-slug">
              Адреса
            </label>
            <input
              id="sc-slug"
              className="wb-input wb-input-error"
              defaultValue="мій шлях"
              readOnly
            />
            <span className="sc-field-hint">Лише латиниця, цифри й дефіс</span>
          </div>
          <div className="sc-field">
            <label className="sc-field-label" htmlFor="sc-kind">
              Вид
            </label>
            <select id="sc-kind" className="wb-select" defaultValue="screen">
              <option value="screen">Екран</option>
              <option value="article">Стаття</option>
              <option value="shop">Магазин</option>
            </select>
          </div>
          <div className="sc-field">
            <label className="sc-field-label" htmlFor="sc-about">
              Опис
            </label>
            <textarea
              id="sc-about"
              className="wb-textarea"
              rows={2}
              defaultValue="Короткий опис того, що людина знайде на сторінці."
            />
          </div>
        </div>

        <div className="sc-actions">
          <button type="button" className="wb-btn wb-btn-primary">
            Зберегти
          </button>
          <button type="button" className="wb-btn wb-btn-secondary">
            Скасувати
          </button>
          <button type="button" className="wb-btn wb-btn-ghost">
            Видалити
          </button>
        </div>
      </div>

      <div className="sc-card">
        <SwitchRow
          label="Публічний профіль"
          hint="Вас видно іншим"
          checked={publicProfile}
          onToggle={setPublicProfile}
        />
        <SwitchRow
          label="Сповіщення"
          hint="Лише важливі події"
          checked={alerts}
          onToggle={setAlerts}
        />
      </div>
    </section>
  );
}
