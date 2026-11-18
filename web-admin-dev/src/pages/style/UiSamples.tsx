/**
 * Зразки елементів єдиного UI: справжня розмітка платформи для кожного класу з
 * переліку.
 *
 * Слова — з переліку (`ui-inventory.json`), дрібні складники — `UiSampleParts`.
 *
 * @module web-admin-dev/src/pages/style/UiSamples
 */

import type { ReactElement, ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  CloseButton,
  SampleCard,
  SampleField,
  SampleTable,
  type InventoryCopy,
  type InventoryElement,
} from "./UiSampleParts";

export type { InventoryCopy, InventoryElement } from "./UiSampleParts";

/** Один зразок за ключем елемента; невідомий ключ показує власний клас. */
export function UiSample({
  element,
  copy,
}: {
  element: InventoryElement;
  copy: InventoryCopy;
}): ReactElement {
  const text = element.sampleText;
  let content: ReactNode;

  switch (element.sample) {
    case "btn":
    case "btn-primary":
    case "btn-secondary":
    case "btn-ghost":
    case "btn-danger":
    case "btn-sm": {
      const variant = element.sample === "btn" ? "" : ` wb-${element.sample}`;
      content = (
        <button type="button" className={`wb-btn${variant}`}>
          {text}
        </button>
      );
      break;
    }
    case "close-btn":
      content = <CloseButton copy={copy} />;
      break;
    case "move-btn":
      content = (
        <button type="button" className="wb-move-btn" aria-label={copy.a11y.moveUp}>
          <Icon name="chevron-up" size={16} />
        </button>
      );
      break;

    case "input":
      content = <input className="wb-input" placeholder={text} readOnly />;
      break;
    case "select":
      content = (
        <select className="wb-select" defaultValue="a">
          <option value="a">{text}</option>
          <option value="b">{copy.sampleOption}</option>
        </select>
      );
      break;
    case "textarea":
      content = <textarea className="wb-textarea" placeholder={text} rows={2} readOnly />;
      break;
    case "check":
      /* У продукті це сам контрол: підпис до нього ставить форма, а не клас. */
      content = <input type="checkbox" className="wb-check" defaultChecked aria-label={text} />;
      break;
    case "label":
      content = <span className="wb-label">{text}</span>;
      break;
    case "field":
      content = <SampleField text={text} copy={copy} />;
      break;
    case "field-hint":
      content = <span className="wb-field-hint">{text}</span>;
      break;
    case "input-error":
      content = <input className="wb-input wb-input-error" defaultValue={text} readOnly />;
      break;
    case "tags-input":
      content = (
        <div className="wb-tags-input">
          <input className="wb-input" placeholder={text} readOnly />
        </div>
      );
      break;

    case "card":
      content = <SampleCard title={text} copy={copy} />;
      break;
    case "card-header":
      content = (
        <div className="wb-card-header">
          <span className="wb-card-title">{text}</span>
        </div>
      );
      break;
    case "card-body":
      content = <div className="wb-card-body">{text}</div>;
      break;
    case "sheet":
      content = (
        <div className="wb-sheet">
          <div className="wb-sheet-head">{text}</div>
        </div>
      );
      break;
    case "cover":
      content = (
        <div className="wb-cover">
          <p className="wb-cover-date wb-cover-line">{copy.sampleValue}</p>
          <h2 className="wb-cover-title wb-cover-line">{text}</h2>
        </div>
      );
      break;

    case "modal":
      content = (
        <div className="wb-modal">
          <div className="wb-modal-header">
            <span className="wb-modal-title">{text}</span>
            {<CloseButton copy={copy} />}
          </div>
          <div className="wb-modal-body">{copy.sampleBody}</div>
          <div className="wb-modal-footer">
            <button type="button" className="wb-btn wb-btn-secondary">
              {copy.sampleCancel}
            </button>
            <button type="button" className="wb-btn wb-btn-primary">
              {copy.sampleDone}
            </button>
          </div>
        </div>
      );
      break;
    case "modal-overlay":
      content = (
        <div className="wb-modal-overlay">
          <div className="wb-modal">
            <div className="wb-modal-header">
              <span className="wb-modal-title">{copy.sampleDone}</span>
              {<CloseButton copy={copy} />}
            </div>
          </div>
        </div>
      );
      break;
    case "modal-header":
      content = (
        <div className="wb-modal">
          <div className="wb-modal-header">
            <span className="wb-modal-title">{text}</span>
            {<CloseButton copy={copy} />}
          </div>
        </div>
      );
      break;
    case "modal-body":
      content = (
        <div className="wb-modal">
          <div className="wb-modal-body">{text}</div>
        </div>
      );
      break;
    case "modal-footer":
      content = (
        <div className="wb-modal">
          <div className="wb-modal-footer">
            <button type="button" className="wb-btn wb-btn-secondary">
              {copy.sampleCancel}
            </button>
            <button type="button" className="wb-btn wb-btn-primary">
              {text}
            </button>
          </div>
        </div>
      );
      break;
    case "dialog":
      content = (
        <div className="wb-modal wb-dialog">
          <div className="wb-modal-body wb-dialog-body">
            <p className="wb-dialog-message">{text}</p>
          </div>
          <div className="wb-modal-footer wb-dialog-footer">
            <button type="button" className="wb-dialog-btn">
              {copy.sampleCancel}
            </button>
            <button type="button" className="wb-dialog-btn">
              {copy.sampleDone}
            </button>
          </div>
        </div>
      );
      break;
    case "menu-item":
      content = (
        <div className="wb-menu-list">
          <button type="button" className="wb-menu-item">
            <span className="wb-menu-item-icon">
              <Icon name="search" size={16} />
            </span>
            <span className="wb-menu-item-text">
              <span className="wb-menu-item-label">{text}</span>
              <span className="wb-menu-item-hint">{copy.a11y.search}</span>
            </span>
          </button>
        </div>
      );
      break;
    case "tabs":
      content = (
        <div className="wb-tabs">
          <button type="button" className="wb-tabs-btn wb-tabs-btn--active">
            {text}
          </button>
          <button type="button" className="wb-tabs-btn">
            {copy.sampleOption}
          </button>
        </div>
      );
      break;
    case "segmented":
      content = (
        <div className="wb-segmented">
          <button type="button" className="wb-segmented-btn wb-segmented-btn--active">
            {text}
          </button>
          <button type="button" className="wb-segmented-btn">
            {copy.sampleOption}
          </button>
        </div>
      );
      break;

    case "table-scroll":
      content = (
        <div className="wb-table-scroll">
          <SampleTable copy={copy} />
        </div>
      );
      break;
    case "table":
      content = <SampleTable copy={copy} />;
      break;
    case "badge":
    case "badge-green":
    case "badge-yellow":
    case "badge-red":
    case "badge-accent":
    case "badge-neutral": {
      const variant = element.sample === "badge" ? "" : ` ${element.className}`;
      content = <span className={`wb-badge${variant}`}>{text}</span>;
      break;
    }
    case "chip":
      content = <span className="wb-chip">{text}</span>;
      break;

    case "empty":
      content = (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="info" size={20} />
          </span>
          <p className="wb-empty-text">{text}</p>
        </div>
      );
      break;
    case "skeleton":
      content = <div className="wb-skeleton ui-skeleton-sample" />;
      break;
    case "switch":
      content = (
        <button
          type="button"
          role="switch"
          aria-checked="true"
          aria-label={copy.a11y.switch}
          className="wb-switch wb-switch--on"
        >
          <span className="wb-switch-knob" />
        </button>
      );
      break;
    case "save-actions":
      content = (
        <div className="wb-save-actions">
          <button type="button" className="wb-btn wb-btn-secondary wb-save-actions-btn">
            {copy.sampleCancel}
          </button>
          <button type="button" className="wb-btn wb-btn-primary wb-save-actions-btn">
            {text}
          </button>
        </div>
      );
      break;

    case "text-xs":
    case "text-sm":
    case "text-base":
    case "text-md":
    case "text-muted":
    case "text-primary":
      content = <span className={element.className}>{text}</span>;
      break;

    case "block-hero":
      content = (
        <section className="wb-block-hero wb-block-hero--left">
          <div className="wb-block-hero__body">
            <h2 className="wb-block-hero__title">{text}</h2>
            <p className="wb-block-hero__subtitle">{copy.sampleBody}</p>
            <div className="wb-block-hero__actions">
              <button type="button" className="wb-btn wb-btn-primary">
                {copy.sampleDone}
              </button>
            </div>
          </div>
        </section>
      );
      break;
    case "block-section":
      content = (
        <section className="wb-block-section">
          <h2 className="wb-block-section__head">
            <button
              type="button"
              className="wb-block-section__toggle wb-block-section__toggle--open"
            >
              {text}
            </button>
          </h2>
          <div className="wb-block-section__body">{copy.sampleBody}</div>
        </section>
      );
      break;

    default:
      content = <span className={element.className}>{text}</span>;
  }

  const staged = [
    "modal",
    "modal-overlay",
    "modal-header",
    "modal-body",
    "modal-footer",
    "dialog",
    "cover",
    "block-hero",
    "block-section",
  ].includes(element.sample);

  return <div className={staged ? "ui-sample ui-sample-stage" : "ui-sample"}>{content}</div>;
}
