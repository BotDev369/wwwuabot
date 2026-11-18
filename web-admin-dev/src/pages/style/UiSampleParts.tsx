/**
 * Дрібні зразки, з яких зібрано перелік: картка, поле, таблиця, кнопка
 * закриття.
 *
 * **Тут немає власного вигляду** — ті самі класи платформи, що й у продукті.
 *
 * @module web-admin-dev/src/pages/style/UiSampleParts
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";

export type InventoryElement = {
  id: string;
  name: string;
  className: string;
  sample: string;
  sampleText: string;
  note: string;
  usage: { platform: number; admin: number; ui: number; shared: number };
  verdict: "both" | "builder" | "one" | "shared" | "unused";
  /** Знак: його ім'я з `IconName`; зразок малює `<Icon name />`. */
  icon?: string;
  /** Не прямий клас у розмітці, а рендер через механізм (Page Builder). */
  via?: string;
};

export type InventoryCopy = {
  legend: string;
  total: string;
  platform: string;
  admin: string;
  sharedCode: string;
  sampleBody: string;
  sampleValue: string;
  sampleOption: string;
  sampleCancel: string;
  sampleDone: string;
  sampleCell: string;
  sampleColumn: string;
  sampleRow: string;
  a11y: { close: string; moveUp: string; switch: string; search: string };
};

export function CloseButton({ copy }: { copy: InventoryCopy }): ReactElement {
  return (
    <button type="button" className="wb-close-btn" aria-label={copy.a11y.close}>
      <Icon name="close" size={16} />
    </button>
  );
}

export function SampleField({ text, copy }: { text: string; copy: InventoryCopy }): ReactElement {
  return (
    <div className="wb-field">
      <span className="wb-label">{text}</span>
      <input className="wb-input" placeholder={copy.sampleValue} readOnly />
    </div>
  );
}

export function SampleCard({ title, copy }: { title: string; copy: InventoryCopy }): ReactElement {
  return (
    <div className="wb-card">
      <div className="wb-card-header">
        <span className="wb-card-title">{title}</span>
      </div>
      <div className="wb-card-body">{copy.sampleBody}</div>
    </div>
  );
}

export function SampleTable({ copy }: { copy: InventoryCopy }): ReactElement {
  return (
    <table className="wb-table">
      <thead>
        <tr>
          <th>{copy.sampleColumn}</th>
          <th>{copy.sampleColumn}</th>
        </tr>
      </thead>
      <tbody>
        {[0, 1, 2].map((row) => (
          <tr key={row}>
            <td>{`${copy.sampleRow} ${row + 1}`}</td>
            <td>{copy.sampleCell}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
