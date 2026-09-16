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
  | "arrow-down"
  | "arrow-left"
  | "arrow-right"
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "chevron-up"
  | "sun"
  | "moon"
  | "x"
  | "plus"
  | "minus"
  | "heart"
  | "download"
  | "upload"
  | "refresh"
  | "external-link"
  | "menu"
  | "text"
  | "list"
  | "divider"
  | "button"
  | "sliders"
  // --- Page Builder block icons ---
  | "video"
  | "grid"
  | "quote"
  | "code"
  | "tag"
  | "layout"
  | "card"
  | "tabs"
  | "star"
  | "bar-chart"
  | "message-square"
  | "hash"
  | "percent"
  | "search"
  | "filter"
  | "sort"
  | "layers"
  | "calendar"
  | "user"
  | "play"
  // --- Нижній футер: залиті пари до контурних гліфів ---
  | "home-solid"
  | "my-dates-solid"
  | "scenarios-solid"
  | "users-solid"
  | "user-solid"
  | "shop"
  | "shop-solid";

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

/**
 * Залитий (solid) варіант контурної іконки.
 *
 * Нижній футер працює як у топових застосунків (YouTube, Instagram, TikTok):
 * неактивний розділ — контурний гліф, активний — той самий гліф ЗАЛИТИЙ.
 * Це читається як «вибрано» кольором і товщиною самого знака, без фонового
 * кола під іконкою, яке ріже око.
 */
const solidAttrs = { ...svgAttrs, fill: "currentColor", stroke: "none" };

function solid(children: ReactNode[]): ReactElement {
  return createElement("svg", solidAttrs, ...children);
}

/** Контур із «вирізаними» ділянками: вкладені subpath-и віднімаються (evenodd). */
function eo(d: string): ReactElement {
  return createElement("path", { d, fillRule: "evenodd" as const, clipRule: "evenodd" as const });
}

/** Обводка всередині залитої іконки (ручка торби): малюється тим самим кольором. */
function st(d: string): ReactElement {
  return createElement("path", {
    d,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  });
}

export const icons: Record<IconName, ReactElement> = {
  home: icon([p("M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"), pl("9 22 9 12 15 12 15 22")]),

  scenarios: icon([r(3, 3, 7, 7, 1), r(14, 3, 7, 7, 1), r(3, 14, 7, 7, 1), r(14, 14, 7, 7, 1)]),

  users: icon([
    p("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"),
    c(9, 7, 4),
    p("M23 21v-2a4 4 0 0 0-3-3.87"),
    p("M16 3.13a4 4 0 0 1 0 7.75"),
  ]),

  bot: icon([r(3, 11, 18, 10, 2), c(12, 5, 2), p("M12 7v4"), l(8, 16, 8, 16), l(16, 16, 16, 16)]),

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

  compare: icon([p("M16 3h5v5"), p("M8 3H3v5"), p("M12 22V8"), p("M21 3l-9 9"), p("M3 3l9 9")]),

  info: icon([c(12, 12, 10), l(12, 16, 12, 12), l(12, 8, 12.01, 8)]),

  settings: icon([
    c(12, 12, 3),
    p(
      "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    ),
  ]),

  logout: icon([
    p("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"),
    pl("16 17 21 12 16 7"),
    l(21, 12, 9, 12),
  ]),

  "sidebar-toggle": icon([r(3, 3, 18, 18, 2), l(9, 3, 9, 21)]),

  eye: icon([p("M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"), c(12, 12, 3)]),

  edit: icon([
    p("M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"),
    p("M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"),
  ]),

  mail: icon([
    p("M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"),
    pl("22 6 12 13 22 6"),
  ]),

  lock: icon([r(3, 11, 18, 11, 2), p("M7 11V7a5 5 0 0 1 10 0v4")]),

  unlock: icon([r(3, 11, 18, 11, 2), p("M7 11V7a5 5 0 0 1 9.9-1")]),

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
    p(
      "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
    ),
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

  image: icon([r(3, 3, 18, 18, 2), c(8.5, 8.5, 1.5), p("M21 15l-5-5L5 21")]),

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

  blocks: icon([r(3, 3, 7, 7, 1), r(14, 3, 7, 7, 1), r(3, 14, 7, 7, 1), r(14, 14, 7, 7, 1)]),

  link: icon([
    p("M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"),
    p("M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"),
  ]),

  copy: icon([r(9, 9, 13, 13, 2), p("M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1")]),

  check: icon([pl("20 6 9 17 4 12")]),

  close: icon([l(18, 6, 6, 18), l(6, 6, 18, 18)]),

  "arrow-up": icon([p("M12 19V5"), p("M5 12l7-7 7 7")]),

  "arrow-down": icon([p("M12 5v14"), p("M19 12l-7 7-7-7")]),

  sun: icon([
    p("M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"),
    p("M12 1v2"),
    p("M12 21v2"),
    p("M4.22 4.22l1.42 1.42"),
    p("M18.36 18.36l1.42 1.42"),
    p("M1 12h2"),
    p("M21 12h2"),
    p("M4.22 19.78l1.42-1.42"),
    p("M18.36 5.64l1.42-1.42"),
  ]),

  moon: icon([p("M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z")]),

  // --- Page Builder block icons ---

  video: icon([r(2, 2, 20, 20, 2), pl("10 8 16 12 10 16 10 8")]),

  grid: icon([r(3, 3, 7, 7, 1), r(14, 3, 7, 7, 1), r(3, 14, 7, 7, 1), r(14, 14, 7, 7, 1)]),

  quote: icon([
    p(
      "M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z",
    ),
    p(
      "M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 .001 0 1.002 1 1.002z",
    ),
  ]),

  code: icon([pl("16 18 22 12 16 6"), pl("8 6 2 12 8 18")]),

  tag: icon([
    p("M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"),
    l(7, 7, 7.01, 7.01),
  ]),

  layout: icon([r(3, 3, 18, 18, 2), l(9, 3, 9, 21)]),

  card: icon([r(2, 3, 20, 14, 2), p("M2 7h20"), p("M2 11h20")]),

  tabs: icon([
    r(2, 3, 20, 18, 2),
    p("M2 3h6a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h6"),
  ]),

  star: icon([
    p(
      "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    ),
  ]),

  "bar-chart": icon([l(12, 20, 12, 10), l(18, 20, 18, 4), l(6, 20, 6, 14)]),

  "message-square": icon([p("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z")]),

  hash: icon([l(4, 9, 20, 9), l(4, 15, 20, 15), l(10, 3, 8, 21), l(6, 3, 4, 21)]),

  percent: icon([p("M19 5L5 19"), c(6.5, 6.5, 4.5), c(12, 12, 4.5)]),

  search: icon([c(11, 11, 8), l(21, 21, 16, 16)]),

  filter: icon([p("M22 3H2l8 9.46V19l4 2v-8.54L22 3z")]),

  // Порядок — дві стрілки в різні боки: «вгору» й «вниз» разом.
  sort: icon([p("M7 20V4"), p("M3 8l4-4 4 4"), p("M17 4v16"), p("M21 16l-4 4-4-4")]),

  // Групування — стос шарів: те саме «скласти в купки», лише знаком.
  layers: icon([
    p("M12 3 3 7.5l9 4.5 9-4.5L12 3z"),
    p("M3 12.5 12 17l9-4.5"),
    p("M3 17 12 21.5 21 17"),
  ]),

  calendar: icon([r(3, 4, 18, 18, 2), l(16, 2, 16, 6), l(8, 2, 8, 6), l(3, 10, 21, 10)]),

  user: icon([p("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"), c(12, 7, 4)]),

  play: icon([p("M5 3l14 9-14 9V3z")]),

  // --- Navigation icons ---
  "arrow-left": icon([p("M19 12H5"), p("M12 19l-7-7 7-7")]),

  "arrow-right": icon([p("M5 12h14"), p("M12 5l7 7-7 7")]),

  "chevron-down": icon([pl("6 9 12 15 18 9")]),

  "chevron-right": icon([pl("9 18 15 12 9 6")]),

  "chevron-left": icon([pl("15 18 9 12 15 6")]),

  "chevron-up": icon([pl("18 15 12 9 6 15")]),

  x: icon([l(18, 6, 6, 18), l(6, 6, 18, 18)]),

  plus: icon([l(12, 5, 12, 19), l(5, 12, 19, 12)]),

  minus: icon([l(5, 12, 19, 12)]),

  heart: icon([
    p(
      "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    ),
  ]),

  download: icon([
    p("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"),
    pl("7 10 12 15 17 10"),
    l(12, 15, 12, 3),
  ]),

  upload: icon([
    p("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"),
    pl("17 8 12 3 12-5"),
    l(12, 3, 12, 21),
  ]),

  refresh: icon([
    p("M23 4v6h-6"),
    p("M1 20v-6h6"),
    p("M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"),
  ]),

  "external-link": icon([
    p("M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"),
    pl("15 3 21 3 21 9"),
    l(10, 14, 21, 3),
  ]),

  menu: icon([p("M3 12h18"), p("M3 6h18"), p("M3 18h18")]),

  text: icon([p("M4 7V4h16v3"), p("M9 20h6"), p("M12 4v16")]),

  list: icon([p("M8 6h13"), p("M8 12h13"), p("M8 18h13"), l(3, 6, 3, 6), l(3, 6, 3, 6)]),

  divider: icon([l(3, 12, 21, 12)]),

  button: icon([r(4, 8, 16, 8, 4), l(10, 12, 14, 12)]),

  sliders: icon([
    l(4, 21, 4, 14),
    l(12, 21, 12, 3),
    l(20, 21, 20, 10),
    l(4, 14, 4, 14),
    l(12, 3, 12, 3),
    l(20, 10, 20, 10),
  ]),

  // --- Нижній футер: залиті варіанти ------------------------------------
  //  Той самий знак, що й контурний вище, але фарбою: активний розділ у
  //  футері має читатись сам, без фонового кола під іконкою.

  "home-solid": solid([
    p(
      "M12 2.8 3.2 9.6V19.4A1.6 1.6 0 0 0 4.8 21H9V14.2a1.6 1.6 0 0 1 1.6-1.6h2.8a1.6 1.6 0 0 1 1.6 1.6V21h4.2a1.6 1.6 0 0 0 1.6-1.6V9.6L12 2.8Z",
    ),
  ]),

  "my-dates-solid": solid([
    r(7, 2.6, 1.7, 3.6, 0.85),
    r(15.3, 2.6, 1.7, 3.6, 0.85),
    eo(
      "M6.5 5h11a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-11a2.5 2.5 0 0 1-2.5-2.5v-10A2.5 2.5 0 0 1 6.5 5Z" +
        "M6.6 9.4h2.6v2.5H6.6Z M10.7 9.4h2.6v2.5h-2.6Z M14.8 9.4h2.6v2.5h-2.6Z" +
        "M6.6 14h2.6v2.5H6.6Z M10.7 14h2.6v2.5h-2.6Z M14.8 14h2.6v2.5h-2.6Z",
    ),
  ]),

  "scenarios-solid": solid([
    r(3, 3, 7.5, 7.5, 2),
    r(13.5, 3, 7.5, 7.5, 2),
    r(3, 13.5, 7.5, 7.5, 2),
    r(13.5, 13.5, 7.5, 7.5, 2),
  ]),

  "users-solid": solid([
    c(7, 8.4, 2.4),
    c(17, 8.4, 2.4),
    c(12, 7.6, 3.2),
    p(
      "M4 20.4c0-2.6 2.3-4.7 5.2-4.7h5.6c2.9 0 5.2 2.1 5.2 4.7 0 .9-.7 1.6-1.6 1.6H5.6c-.9 0-1.6-.7-1.6-1.6Z",
    ),
  ]),

  "user-solid": solid([
    c(12, 7.6, 4.1),
    p(
      "M12 13.4c-4.1 0-7.4 2.4-7.4 5.4 0 1.2.95 2.1 2.15 2.1h10.5c1.2 0 2.15-.9 2.15-2.1 0-3-3.3-5.4-7.4-5.4Z",
    ),
  ]),

  // Торба, а не цінник («tag» — банальний і не про магазин): тіло + округла
  // ручка, яка сідає РІВНО на верхній край, тому в контурі обводка не ріже рамку.
  shop: icon([r(4, 7.5, 16, 13, 3), p("M8.5 7.5V6.5a3.5 3.5 0 0 1 7 0V7.5")]),

  "shop-solid": solid([r(3.5, 7.5, 17, 13, 3.5), st("M8.5 7.5V6.5a3.5 3.5 0 0 1 7 0V7.5")]),
};
