/**
 * Форми: поле, вибір, область тексту, перемикач і дії.
 *
 * @module web-admin-dev/src/pages/style/FormSection
 */

import { useState, type ReactElement } from "react";
import { SwitchRow } from "@wwwuabot/shared";
import demo from "./demo.json";

const BUTTONS = ["wb-btn-primary", "wb-btn-secondary", "wb-btn-ghost"] as const;

export function FormSection(): ReactElement {
  const { form } = demo;
  const [switches, setSwitches] = useState<boolean[]>(() =>
    form.switches.map((_, index) => index === 0),
  );

  const setSwitch = (index: number, next: boolean): void =>
    setSwitches((prev) => prev.map((value, at) => (at === index ? next : value)));

  return (
    <section className="sc-section">
      <div className="sc-sect-head">
        <h3 className="sc-sect-title">{form.title}</h3>
        <span className="sc-sect-note">{form.note}</span>
      </div>

      <div className="sc-card">
        <div className="sc-form">
          <div className="sc-field">
            <label className="sc-field-label" htmlFor="sc-name">
              {form.name.label}
            </label>
            <input id="sc-name" className="wb-input" defaultValue={form.name.value} />
          </div>
          <div className="sc-field">
            <label className="sc-field-label" htmlFor="sc-slug">
              {form.slug.label}
            </label>
            <input
              id="sc-slug"
              className="wb-input wb-input-error"
              defaultValue={form.slug.value}
              readOnly
            />
            <span className="sc-field-hint">{form.slug.hint}</span>
          </div>
          <div className="sc-field">
            <label className="sc-field-label" htmlFor="sc-kind">
              {form.kind.label}
            </label>
            <select id="sc-kind" className="wb-select" defaultValue={form.kind.options[0].value}>
              {form.kind.options.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sc-field">
            <label className="sc-field-label" htmlFor="sc-about">
              {form.about.label}
            </label>
            <textarea
              id="sc-about"
              className="wb-textarea"
              rows={2}
              defaultValue={form.about.value}
            />
          </div>
        </div>

        <div className="sc-actions">
          {form.actions.map((action, index) => (
            <button type="button" className={`wb-btn ${BUTTONS[index]}`} key={action}>
              {action}
            </button>
          ))}
        </div>
      </div>

      <div className="sc-card">
        {form.switches.map((item, index) => (
          <SwitchRow
            key={item.label}
            label={item.label}
            hint={item.hint}
            checked={switches[index] ?? false}
            onToggle={(next) => setSwitch(index, next)}
          />
        ))}
      </div>
    </section>
  );
}
