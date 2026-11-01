/**
 * Page Builder — Input Block.
 *
 * A single text input field with optional label, placeholder, type, and required validation.
 *
 * @module packages/ui/src/blocks/InputBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function InputBlock({ block }: BlockComponentProps) {
  const {
    label = "",
    placeholder = "",
    type = "text",
    required = false,
    name = "",
  } = block.props as {
    label?: string;
    placeholder?: string;
    type?: string;
    required?: boolean;
    name?: string;
  };

  return (
    <div className="wb-block-input">
      {label && (
        <label className="wb-label" htmlFor={name || undefined}>
          {label}
          {required && (
            <span className="wb-block-field-required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <input
        className="wb-input"
        type={type === "phone" ? "tel" : type}
        placeholder={placeholder}
        required={required}
        name={name || undefined}
        id={name || undefined}
        data-block-field={name || undefined}
      />
    </div>
  );
}
