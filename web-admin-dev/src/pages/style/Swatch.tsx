/**
 * Зразок значення токена: колір — заливка, мірка — смуга, тінь — коробка.
 *
 * Єдиний інлайн тут — `--st-fill`: це значення з каталогу, а не стиль.
 *
 * @module web-admin-dev/src/pages/style/Swatch
 */

import type { CSSProperties } from "react";
import { swatchKind, type StyleToken } from "./useStyleInventory";

interface SwatchProps {
  value: string;
  /** Каталог токенів — щоб розкрити `var(--…)` у справжнє значення. */
  tokens: StyleToken[];
  /** Шар, у якому рахувати `var(--…)`: світлий, темний або поточний. */
  scheme?: "light" | "dark";
}

export function Swatch({ value, tokens, scheme = "light" }: SwatchProps) {
  const kind = swatchKind(value, tokens);
  const fill = { "--st-fill": value } as CSSProperties;

  if (!value) return <span className="st-swatch" aria-hidden="true" />;

  if (kind === "color") {
    return (
      <span
        className="st-swatch"
        data-theme={scheme}
        style={fill}
        title={value}
        aria-hidden="true"
      />
    );
  }

  if (kind === "size") {
    return (
      <span className="st-swatch st-swatch--bar" style={fill} title={value} aria-hidden="true" />
    );
  }

  if (kind === "shadow") {
    return (
      <span
        className="st-swatch st-swatch--shadow"
        data-theme={scheme}
        style={fill}
        title={value}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className="st-swatch st-swatch--text"
      data-theme={scheme}
      title={value}
      aria-hidden="true"
    >
      Aa
    </span>
  );
}
