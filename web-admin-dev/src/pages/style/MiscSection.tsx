/**
 * Статуси, навігація, порожній стан, завантаження й модалка.
 *
 * Усе — наявні кирпичики плюс ролі каталогу; демо не заводить власних кнопок.
 *
 * @module web-admin-dev/src/pages/style/MiscSection
 */

import { useState, type ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import demo from "./demo.json";

const BADGES = [
  "wb-badge-green",
  "wb-badge-yellow",
  "wb-badge-red",
  "wb-badge-neutral",
  "wb-badge-accent",
];

export function MiscSection(): ReactElement {
  const { misc } = demo;
  const [open, setOpen] = useState(false);

  return (
    <section className="sc-section">
      <div className="sc-sect-head">
        <h3 className="sc-sect-title">{misc.title}</h3>
        <span className="sc-sect-note">{misc.note}</span>
      </div>

      <div className="sc-grid">
        <article className="sc-card">
          <h4 className="sc-card-title">{misc.statusesTitle}</h4>
          <div className="sc-inline">
            {misc.statuses.map((status, index) => (
              <span className={`wb-badge ${BADGES[index % BADGES.length]}`} key={status}>
                {status}
              </span>
            ))}
          </div>
          <div className="sc-inline">
            {misc.chips.map((chip) => (
              <span className="wb-chip" key={chip}>
                {chip}
              </span>
            ))}
            <span className="wb-chip-sm">{misc.chipSmall}</span>
          </div>
        </article>

        <article className="sc-card">
          <h4 className="sc-card-title">{misc.navTitle}</h4>
          <nav className="sc-nav" aria-label={misc.navLabel}>
            {misc.nav.map((item) => (
              <span
                className={item.on ? "sc-nav-link sc-nav-link-on" : "sc-nav-link"}
                key={item.label}
              >
                <Icon name={item.icon as IconName} size={16} />
                {item.label}
              </span>
            ))}
          </nav>
        </article>

        <article className="sc-card">
          <h4 className="sc-card-title">{misc.loadingTitle}</h4>
          <span className="sc-skeleton sc-skeleton-lg sc-motion-pulse" />
          <span className="sc-skeleton sc-motion-pulse" />
          <span className="sc-skeleton sc-skeleton-sm sc-motion-pulse" />
          <p className="sc-demo-note">{misc.loadingNote}</p>
        </article>
      </div>

      <div className="sc-grid">
        <div className="sc-empty">
          <span className="sc-tone-ink sc-size-head">{misc.empty.title}</span>
          <span className="sc-tone-muted sc-size-body">{misc.empty.text}</span>
          <button type="button" className="wb-btn wb-btn-primary">
            {misc.empty.action}
          </button>
        </div>

        <div className="sc-card">
          <h4 className="sc-card-title">{misc.modal.title}</h4>
          <p className="sc-demo-note">{misc.modal.note}</p>
          <div className="sc-actions">
            <button type="button" className="wb-btn wb-btn-secondary" onClick={() => setOpen(true)}>
              {misc.modal.open}
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
          <div className="wb-modal" role="dialog" aria-modal="true" aria-label={misc.modal.dialog}>
            <div className="wb-modal-header">
              <h3 className="wb-modal-title">{misc.modal.dialog}</h3>
              <button
                type="button"
                className="wb-close-btn"
                onClick={() => setOpen(false)}
                aria-label={misc.modal.close}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="wb-modal-body">
              <p className="sc-tone-muted sc-size-body">{misc.modal.body}</p>
            </div>
            <div className="wb-modal-footer">
              <button
                type="button"
                className="wb-btn wb-btn-primary"
                onClick={() => setOpen(false)}
              >
                {misc.modal.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
