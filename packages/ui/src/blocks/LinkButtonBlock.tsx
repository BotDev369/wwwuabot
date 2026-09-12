/**
 * Page Builder — Link Button Block.
 *
 * A customizable link button with URL navigation, variant styling,
 * alignment, sizing, and optional icons.
 * Available in all zones (header, sidebar, main, footer).
 *
 * @module packages/ui/src/blocks/LinkButtonBlock
 */
import type { CSSProperties } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { icons, type IconName } from "@wwwuabot/shared";

const VARIANT_CLASSES: Record<string, string> = {
  primary: "wb-btn wb-btn-primary",
  secondary: "wb-btn wb-btn-secondary",
  outline: "wb-btn",
  ghost: "wb-btn wb-btn-ghost",
};

const SIZE_STYLES: Record<string, CSSProperties> = {
  sm: { fontSize: 12, padding: "4px 10px" },
  md: { fontSize: 14, padding: "8px 16px" },
  lg: { fontSize: 16, padding: "12px 24px" },
};

export function LinkButtonBlock({ block }: BlockComponentProps) {
  const {
    text = "Перейти за посиланням",
    url = "#",
    target = "_blank",
    variant = "primary",
    size = "md",
    align = "left",
    icon,
  } = block.props as {
    text?: string;
    url?: string;
    target?: string;
    variant?: string;
    size?: string;
    align?: "left" | "center" | "right" | "full";
    icon?: string;
  };

  const isFull = align === "full";
  const justify = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  const btnClass = VARIANT_CLASSES[variant] ?? "wb-btn wb-btn-primary";
  const sizeStyle = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  const isTargetBlank = target === "_blank";

  const iconKey = icon as IconName | undefined;
  const hasIcon = iconKey && iconKey in icons;

  return (
    <div
      className="wb-block-link-button-wrapper"
      style={{
        display: "flex",
        width: "100%",
        justifyContent: isFull ? "stretch" : justify,
      }}
    >
      <a
        href={url || "#"}
        target={isTargetBlank ? "_blank" : "_self"}
        rel={isTargetBlank ? "noopener noreferrer" : undefined}
        className={`wb-block-link-button ${btnClass}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          textDecoration: "none",
          width: isFull ? "100%" : undefined,
          ...sizeStyle,
        }}
      >
        {hasIcon && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              width: 16,
              height: 16,
              flexShrink: 0,
            }}
          >
            {icons[iconKey]}
          </span>
        )}
        <span>{text}</span>
      </a>
    </div>
  );
}
