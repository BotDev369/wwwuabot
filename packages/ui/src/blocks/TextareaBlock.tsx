/**
 * Page Builder — Textarea Block.
 *
 * A multi-line text input field with optional label, placeholder, and required validation.
 *
 * @module packages/ui/src/blocks/TextareaBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

export function TextareaBlock({ block }: BlockComponentProps) {
  const {
    label = '',
    placeholder = '',
    rows = 4,
    required = false,
    name = '',
  } = block.props as {
    label?: string;
    placeholder?: string;
    rows?: number;
    required?: boolean;
    name?: string;
  };

  return (
    <div className="wb-block-textarea" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
      {label && (
        <label className="wb-label" htmlFor={name || undefined}>
          {label}
          {required && <span style={{ color: 'var(--red)', marginLeft: '2px' }}>*</span>}
        </label>
      )}
      <textarea
        className="wb-textarea"
        placeholder={placeholder}
        rows={rows}
        required={required}
        name={name || undefined}
        id={name || undefined}
        data-block-field={name || undefined}
        style={{ width: '100%', resize: 'vertical' }}
      />
    </div>
  );
}
