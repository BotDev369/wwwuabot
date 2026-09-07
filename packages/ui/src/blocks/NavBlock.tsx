/**
 * Page Builder — Navigation / Menu Block.
 *
 * A customizable navigation menu with links, pills, buttons, or underline styles.
 * Supports horizontal and vertical orientations, custom typography sizes, and item spacing.
 * Available in all zones (header, sidebar, main, footer).
 *
 * @module packages/ui/src/blocks/NavBlock
 */

import React from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { icons, type IconName } from "@wwwuabot/shared";

interface NavItem {
  text: string;
  url?: string;
  icon?: string;
}

const FONT_SIZE_MAP: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 16,
  lg: 18,
  xl: 20,
};

const SPACING_MAP: Record<string, number> = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

function parseValue(
  val: unknown,
  map: Record<string, number>,
  fallback: number,
): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    if (val in map) return map[val];
    const n = parseInt(val, 10);
    if (!isNaN(n)) return n;
  }
  return fallback;
}

export function NavBlock({ block, zone, context }: BlockComponentProps) {
  const {
    items = [],
    direction = zone === "sidebar" ? "vertical" : "horizontal",
    align = "left",
    style = "links",
    fontSize: propFontSize,
    itemSpacing: propItemSpacing,
  } = block.props as {
    items?: NavItem[];
    direction?: "horizontal" | "vertical";
    align?: "left" | "center" | "right" | "space-between";
    style?: "links" | "pills" | "buttons" | "underline";
    fontSize?: string | number;
    itemSpacing?: string | number;
  };

  const isSidebar = zone === "sidebar";
  const sidebarSettings = context?.sidebarSettings;

  // Resolve font size and spacing (prop -> sidebarSettings -> defaults)
  const effectiveFontSizeVal =
    propFontSize ?? (isSidebar ? sidebarSettings?.fontSize : undefined) ?? "sm";
  const effectiveSpacingVal =
    propItemSpacing ??
    (isSidebar ? sidebarSettings?.itemSpacing : undefined) ??
    (isSidebar ? "sm" : "xs");

  const resolvedFontSize = parseValue(effectiveFontSizeVal, FONT_SIZE_MAP, 14);
  const resolvedSpacing = parseValue(
    effectiveSpacingVal,
    SPACING_MAP,
    direction === "horizontal" ? 8 : 8,
  );

  if (!items || items.length === 0) {
    return (
      <nav
        className="wb-block-nav wb-block-nav--empty"
        style={{
          padding: "8px 12px",
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-sm, 4px)",
          color: "var(--text-muted, #888)",
          fontSize: resolvedFontSize,
          textAlign: "center",
          background: "var(--bg-2, rgba(128,128,128,0.04))",
        }}
      >
        Меню (порожнє — додайте посилання у налаштуваннях блоку)
      </nav>
    );
  }

  const isHorizontal = direction === "horizontal";
  const justify =
    align === "center"
      ? "center"
      : align === "right"
        ? "flex-end"
        : align === "space-between"
          ? "space-between"
          : "flex-start";

  const getItemStyle = (navStyle: string): React.CSSProperties => {
    const padY = Math.max(4, Math.round(resolvedFontSize * 0.45));
    const padX = Math.max(6, Math.round(resolvedFontSize * 0.7));

    const base: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: Math.max(6, Math.round(resolvedFontSize * 0.5)),
      textDecoration: "none",
      fontSize: resolvedFontSize,
      lineHeight: 1.4,
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.15s ease",
    };

    switch (navStyle) {
      case "pills":
        return {
          ...base,
          padding: `${padY}px ${padX + 6}px`,
          borderRadius: "var(--radius-full, 9999px)",
          background: "var(--bg-2, #f3f4f6)",
          color: "var(--text-primary)",
          border: "1px solid transparent",
        };
      case "buttons":
        return {
          ...base,
          padding: `${padY}px ${padX + 6}px`,
          borderRadius: "var(--radius-md, 6px)",
          background: "var(--accent, #6366f1)",
          color: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        };
      case "underline":
        return {
          ...base,
          padding: `${padY}px 4px`,
          color: "var(--text-primary)",
          borderBottom: "2px solid var(--accent, #6366f1)",
          borderRadius: 0,
        };
      case "links":
      default:
        return {
          ...base,
          padding: `${padY}px ${padX}px`,
          color: "var(--text-secondary, #4b5563)",
          borderRadius: "var(--radius-sm, 4px)",
        };
    }
  };

  const itemStyle = getItemStyle(style);
  const iconDimension = Math.max(14, resolvedFontSize + 1);

  return (
    <nav
      className={`wb-block-nav wb-block-nav--${style} wb-block-nav--${direction}`}
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        flexWrap: isHorizontal ? "wrap" : undefined,
        gap: resolvedSpacing,
        alignItems: isHorizontal ? "center" : "stretch",
        justifyContent: isHorizontal ? justify : undefined,
        width: "100%",
      }}
    >
      {items.map((item, i) => {
        const iconKey = item.icon as IconName | undefined;
        const hasSvgIcon = iconKey && iconKey in icons;

        const content = (
          <>
            {hasSvgIcon ? (
              <span
                style={{
                  display: "inline-flex",
                  width: iconDimension,
                  height: iconDimension,
                  flexShrink: 0,
                }}
              >
                {icons[iconKey]}
              </span>
            ) : item.icon ? (
              <span style={{ fontSize: resolvedFontSize, flexShrink: 0 }}>
                {item.icon}
              </span>
            ) : null}
            <span>{item.text}</span>
          </>
        );

        if (item.url) {
          return (
            <a
              key={i}
              href={item.url}
              className="wb-block-nav__link"
              style={itemStyle}
            >
              {content}
            </a>
          );
        }

        return (
          <span key={i} className="wb-block-nav__item" style={itemStyle}>
            {content}
          </span>
        );
      })}
    </nav>
  );
}
