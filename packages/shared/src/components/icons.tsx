/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SVG ICONS — Unified icon system for sidebars and navigation
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * All icons are 24×24, stroke-based, inherit currentColor.
 * Import as: import { icons } from "@wwwuabot/shared";
 * Render as: {icons[item.icon]}
 */

import { createElement } from "react";
import type { ReactElement } from "react";

export type IconName =
  | "home"
  | "scenarios"
  | "scenarios-admin"
  | "users"
  | "bot"
  | "my-dates"
  | "compare"
  | "info"
  | "settings"
  | "logout"
  | "sidebar-toggle";

const svgAttrs = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function icon(children: ReactElement[]): ReactElement {
  return createElement("svg", svgAttrs, ...children);
}

function p(d: string): ReactElement {
  return createElement("path", { d });
}

function pl(points: string): ReactElement {
  return createElement("polyline", { points });
}

function r(x: number, y: number, w: number, h: number, rx?: number): ReactElement {
  return createElement("rect", { x, y, width: w, height: h, rx });
}

function c(cx: number, cy: number, cr: number): ReactElement {
  return createElement("circle", { cx, cy, r: cr });
}

function l(x1: number, y1: number, x2: number, y2: number): ReactElement {
  return createElement("line", { x1, y1, x2, y2 });
}

export const icons: Record<IconName, ReactElement> = {
  home: icon([
    p("M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"),
    pl("9 22 9 12 15 12 15 22"),
  ]),

  scenarios: icon([
    r(3, 3, 7, 7, 1),
    r(14, 3, 7, 7, 1),
    r(3, 14, 7, 7, 1),
    r(14, 14, 7, 7, 1),
  ]),

  "scenarios-admin": icon([
    c(12, 12, 3),
    p("M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"),
  ]),

  users: icon([
    p("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"),
    c(9, 7, 4),
    p("M23 21v-2a4 4 0 0 0-3-3.87"),
    p("M16 3.13a4 4 0 0 1 0 7.75"),
  ]),

  bot: icon([
    r(3, 11, 18, 10, 2),
    c(12, 5, 2),
    p("M12 7v4"),
    l(8, 16, 8, 16),
    l(16, 16, 16, 16),
  ]),

  "my-dates": icon([
    r(3, 4, 18, 18, 2),
    l(16, 2, 16, 6),
    l(8, 2, 8, 6),
    l(3, 10, 21, 10),
    l(8, 14, 8, 14.01),
    l(12, 14, 12, 14.01),
    l(16, 14, 16, 14.01),
    l(8, 18, 8, 18.01),
    l(12, 18, 12, 18.01),
  ]),

  compare: icon([
    p("M16 3h5v5"),
    p("M8 3H3v5"),
    p("M12 22V8"),
    p("M21 3l-9 9"),
    p("M3 3l9 9"),
  ]),

  info: icon([
    c(12, 12, 10),
    l(12, 16, 12, 12),
    l(12, 8, 12.01, 8),
  ]),

  settings: icon([
    c(12, 12, 3),
    p("M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"),
  ]),

  logout: icon([
    p("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"),
    pl("16 17 21 12 16 7"),
    l(21, 12, 9, 12),
  ]),

  "sidebar-toggle": icon([
    r(3, 3, 18, 18, 2),
    l(9, 3, 9, 21),
  ]),
};
