/**
 * Icon — універсальний компонент іконки.
 *
 * Використання: <Icon name="home" /> або <Icon name="trash" size={14} />
 * Нові файли мають використовувати цей компонент замість локального const ico.
 *
 * @module packages/shared/src/components/Icon
 */

import { icons, type IconName } from "./icons";

interface IconProps {
  name: IconName;
  /** Розмір іконки в px. За замовчуванням 16. */
  size?: number;
  /** Додатковий CSS-клас. */
  className?: string;
}

export function Icon({ name, size = 16, className }: IconProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {icons[name]}
    </span>
  );
}

export type { IconName };
