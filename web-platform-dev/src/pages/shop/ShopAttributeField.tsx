/**
 * Характеристики товару: пари «назва — значення», як їх читає покупець.
 *
 * Пара без назви **не збережеться** — так вирішує `sanitizeProductAttributes`,
 * і вирішує правильно: рядок «— 40 см» у переліку характеристик читався б як
 * зламаний показ, а не як незаповнене поле. Але мовчки це робити не можна: тому
 * поле, у якому є значення без назви, каже про це **тут**, до збереження.
 *
 * @module web-platform-dev/src/pages/shop
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  ATTRIBUTE_NAME_MAX,
  ATTRIBUTE_VALUE_MAX,
  PRODUCT_ATTRIBUTES_MAX,
  type ProductAttribute,
} from "@wwwuabot/shared/shop";

export function ShopAttributeField({
  attributes,
  onChange,
}: {
  attributes: ProductAttribute[];
  onChange: (attributes: ProductAttribute[]) => void;
}): ReactElement {
  function patch(index: number, next: Partial<ProductAttribute>): void {
    onChange(attributes.map((item, i) => (i === index ? { ...item, ...next } : item)));
  }

  function remove(index: number): void {
    onChange(attributes.filter((_, i) => i !== index));
  }

  const full = attributes.length >= PRODUCT_ATTRIBUTES_MAX;

  return (
    <div className="wb-field">
      <span className="wb-label">Характеристики</span>

      {attributes.map((attribute, index) => (
        <div className="shop-attr" key={index}>
          <input
            className="wb-input shop-attr-name"
            value={attribute.name}
            maxLength={ATTRIBUTE_NAME_MAX}
            placeholder="Довжина"
            onChange={(event) => patch(index, { name: event.target.value })}
          />
          <input
            className="wb-input"
            value={attribute.value}
            maxLength={ATTRIBUTE_VALUE_MAX}
            placeholder="40 см"
            onChange={(event) => patch(index, { value: event.target.value })}
          />
          <button
            type="button"
            className="wb-btn wb-btn-ghost site-editor-icon-btn"
            onClick={() => remove(index)}
            aria-label="Прибрати характеристику"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}

      {/* Значення без назви відкине сервер — кажемо про це до збереження. */}
      {attributes.some((attribute) => !attribute.name.trim() && attribute.value.trim()) && (
        <p className="wb-text-red">
          Характеристика без назви не збережеться — впишіть, що це (напр. «Матеріал»).
        </p>
      )}

      <button
        type="button"
        className="wb-btn wb-btn-secondary"
        onClick={() => onChange([...attributes, { name: "", value: "" }])}
        disabled={full}
      >
        <Icon name="plus" size={16} />
        Додати характеристику
      </button>

      <span className="wb-text-muted shop-photo-label">
        Не більше {PRODUCT_ATTRIBUTES_MAX} пар. Назва повторюється лише раз — друга переписала б
        першу мовчки.
      </span>
    </div>
  );
}
