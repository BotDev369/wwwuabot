/**
 * Page Builder — Select Block.
 *
 * A dropdown select field with configurable options and placeholder.
 *
 * @module packages/ui/src/blocks/SelectBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface SelectOption {
  value: string;
  label: string;
}

export function SelectBlock({ block }: BlockComponentProps) {
  const {
    label = '',
    options = [],
    placeholder = 'Оберіть...',
    required = false,
    name = '',
  } = block.props as {
    label?: string;
    options?: SelectOption[];
    placeholder?: string;
    required?: boolean;
    name?: string;
  };

  return (
    <div className="wb-block-select" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
      {label && (
        <label className="wb-label" htmlFor={name || undefined}>
          {label}
          {required && <span style={{ color: 'var(--red)', marginLeft: '2px' }}>*</span>}
        </label>
      )}
      <select
        className="wb-select"
        required={required}
        name={name || undefined}
        id={name || undefined}
        data-block-field={name || undefined}
        style={{ width: '100%' }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
