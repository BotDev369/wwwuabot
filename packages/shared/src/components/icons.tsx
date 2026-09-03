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
import type { ReactElement, ReactNode } from "react";

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
  | "sidebar-toggle"
  | "eye"
  | "edit"
  | "mail"
  | "lock"
  | "unlock"
  | "trash"
  | "clipboard"
  | "globe"
  | "sparkles"
  | "construction"
  | "wrench"
  | "warning"
  | "save"
  | "image"
  | "keyboard"
  | "camera"
  | "blocks"
  | "link"
  | "copy"
  | "check"
  | "close"
  | "arrow-up"
  | "arrow-down";

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

function icon(children: ReactNode[]): ReactElement {
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

  eye: icon([
    p("M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"),
    c(12, 12, 3),
  ]),

  edit: icon([
    p("M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"),
    p("M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"),
  ]),

  mail: icon([
    p("M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"),
    pl("22 6 12 13 22 6"),
  ]),

  lock: icon([
    r(3, 11, 18, 11, 2),
    p("M7 11V7a5 5 0 0 1 10 0v4"),
  ]),

  unlock: icon([
    r(3, 11, 18, 11, 2),
    p("M7 11V7a5 5 0 0 1 9.9-1"),
  ]),

  trash: icon([
    p("M3 6h18"),
    p("M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"),
    l(10, 11, 10, 17),
    l(14, 11, 14, 17),
  ]),

  clipboard: icon([
    p("M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"),
    r(8, 2, 8, 4, 1),
  ]),

  globe: icon([
    c(12, 12, 10),
    l(2, 12, 22, 12),
    p("M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"),
  ]),

  sparkles: icon([
    p("M12 2l1.09 3.41L16 6l-2.91.59L12 10l-1.09-3.41L8 6l2.91-.59L12 2z"),
    p("M19 14l.68 2.05L22 17l-2.32.95L19 20l-.68-2.05L16 17l2.32-.95L19 14z"),
    p("M5 17l.54 1.63L7 19.5l-1.46.87L5 22l-.54-1.63L3 19.5l1.46-.87L5 17z"),
  ]),

  construction: icon([
    p("M2 20h20"),
    p("M5 20V8l7-5 7 5v12"),
    p("M9 20v-4h6v4"),
    p("M9 12h.01"),
    p("M15 12h.01"),
  ]),

  wrench: icon([
    p("M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"),
  ]),

  warning: icon([
    p("M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"),
    l(12, 9, 12, 13),
    l(12, 17, 12.01, 17),
  ]),

  save: icon([
    p("M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"),
    pl("17 21 17 13 7 13 7 21"),
    pl("7 3 7 8 15 8"),
  ]),

  image: icon([
    r(3, 3, 18, 18, 2),
    c(8.5, 8.5, 1.5),
    p("M21 15l-5-5L5 21"),
  ]),

  keyboard: icon([
    r(2, 4, 20, 16, 2),
    l(6, 8, 6.01, 8),
    l(10, 8, 10.01, 8),
    l(14, 8, 14.01, 8),
    l(18, 8, 18.01, 8),
    l(8, 12, 8.01, 12),
    l(12, 12, 12.01, 12),
    l(16, 12, 16.01, 12),
    l(7, 16, 17, 16),
  ]),

  camera: icon([
    p("M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"),
    c(12, 13, 4),
  ]),

  blocks: icon([
    r(3, 3, 7, 7, 1),
    r(14, 3, 7, 7, 1),
    r(3, 14, 7, 7, 1),
    r(14, 14, 7, 7, 1),
  ]),

  link: icon([
    p("M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"),
    p("M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"),
  ]),

  copy: icon([
    r(9, 9, 13, 13, 2),
    p("M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"),
  ]),

  check: icon([
    pl("20 6 9 17 4 12"),
  ]),

  close: icon([
    l(18, 6, 6, 18),
    l(6, 6, 18, 18),
  ]),

  "arrow-up": icon([
    p("M12 19V5"),
    p("M5 12l7-7 7 7"),
  ]),

  "arrow-down": icon([
    p("M12 5v14"),
    p("M19 12l-7 7-7-7"),
  ]),
};
